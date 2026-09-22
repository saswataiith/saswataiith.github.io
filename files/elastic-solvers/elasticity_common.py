"""Transparent 2-D periodic elasticity helpers. GPL-3.0-or-later.
Arrays have shape (Nx, Ny, 2, 2). Both shear entries are stored:
epsilon_xy is tensor shear, so sigma_xy = 2*C44*epsilon_xy.
Use odd grids: they avoid even-grid Nyquist derivative ambiguities.
"""
import numpy as np


def cubic(c11=4.0, c12=2.0, c44=1.0):
    """In-plane cubic stiffness, with epsilon_zz^0 = epsilon_zz = 0.
    This is not a plane-stress reduction. Constants are dimensionless.
    """
    if not np.all(np.isfinite([c11, c12, c44])) or min(c44, c11-c12, c11+2*c12) <= 0:
        raise ValueError('Use stable cubic constants: C44>0, C11-C12>0, C11+2*C12>0.')
    stiffness = np.zeros((2, 2, 2, 2))
    for i in range(2):
        for j in range(2):
            for k in range(2):
                for l in range(2):
                    if i == j == k == l:
                        stiffness[i,j,k,l] = c11
                    elif i == j and k == l:
                        stiffness[i,j,k,l] = c12
                    elif (i == k and j == l) or (i == l and j == k):
                        stiffness[i,j,k,l] = c44
    return stiffness


def stress(stiffness, strain):
    """sigma_ij = sum_kl C_ijkl epsilon_kl; spatial axes are preserved."""
    return np.einsum('...ijkl,...kl->...ij', stiffness, strain)


def reference_compliance(reference, tensor):
    """Inverse on symmetric tensors, explicitly retaining tensor shear."""
    c11, c12, c44 = reference[0,0,0,0], reference[0,0,1,1], reference[0,1,0,1]
    result = np.empty_like(tensor)
    result[...,0,0] = (c11*tensor[...,0,0]-c12*tensor[...,1,1])/(c11*c11-c12*c12)
    result[...,1,1] = (c11*tensor[...,1,1]-c12*tensor[...,0,0])/(c11*c11-c12*c12)
    result[...,0,1] = tensor[...,0,1]/(2*c44)
    result[...,1,0] = result[...,0,1]
    return result


class PeriodicGrid:
    """Fourier differentiation on a unit square, x along array axis 0."""
    def __init__(self, size=65):
        if size < 5 or size % 2 != 1:
            raise ValueError('Choose an odd grid size of at least 5, e.g. 33, 65, 129.')
        self.size = size
        wave = 2*np.pi*np.fft.fftfreq(size, d=1/size)
        self.wave = np.stack(np.meshgrid(wave, wave, indexing='ij'), axis=-1)

    def transform(self, field):
        return np.fft.fftn(field, axes=(0,1))

    def inverse(self, field):
        return np.fft.ifftn(field, axes=(0,1)).real

    def strain(self, displacement):
        gradient_hat = 1j*np.einsum('...i,...j->...ij', self.transform(displacement), self.wave)
        return self.inverse((gradient_hat+gradient_hat.swapaxes(-1,-2))/2)

    def divergence(self, tensor):
        return self.inverse(1j*np.einsum('...ij,...j->...i', self.transform(tensor), self.wave))

    def response(self, reference, polarization):
        """Solve div(Cref:sym grad u - P)=0, mean(u)=0.
        Q_ik(k)=Cref_ijkl k_j k_l. u_hat=-i Q(k)^-1 P_hat.k.
        Full wavevectors are used: no missing |k|^-2 factor.
        """
        acoustic = np.einsum('ijkl,...j,...l->...ik', reference, self.wave, self.wave)
        acoustic[0,0] = np.eye(2)  # temporary only; displacement zero mode set below
        force_hat = np.einsum('...ij,...j->...i', self.transform(polarization), self.wave)
        displacement_hat = -1j*np.linalg.solve(acoustic, force_hat[...,None])[...,0]
        displacement_hat[0,0] = 0
        return self.inverse(displacement_hat)


def rms(array):
    return float(np.sqrt(np.mean(np.abs(array)**2)))


def prepare(stiffness, eigenstrain, mean_strain, reference, relaxation, tolerance, max_iterations):
    n = eigenstrain.shape[0]
    grid = PeriodicGrid(n)
    if eigenstrain.shape != (n,n,2,2) or stiffness.shape != (n,n,2,2,2,2):
        raise ValueError('Expected square fields of symmetric 2-D tensors.')
    if not 0 < relaxation <= 1 or tolerance <= 0 or max_iterations < 1:
        raise ValueError('Use 0 < relaxation <= 1, positive tolerance and iteration limit.')
    mean_strain = np.zeros((2,2)) if mean_strain is None else np.asarray(mean_strain,dtype=float)
    if mean_strain.shape != (2,2) or not np.allclose(mean_strain, mean_strain.T):
        raise ValueError('Mean strain must be a symmetric 2 by 2 tensor.')
    if not all(np.all(np.isfinite(a)) for a in [stiffness,eigenstrain,mean_strain,reference]):
        raise ValueError('All inputs must be finite.')
    # Normalize equilibrium by the initial forcing, retaining a finite scale
    # for uniform loading (whose initial divergence may be exactly zero).
    initial_stress = stress(stiffness, mean_strain-eigenstrain)
    scale = max(rms(grid.divergence(initial_stress)), 2*np.pi*rms(initial_stress), 1e-30)
    return grid, mean_strain, scale


def diagnostics(grid, stiffness, eigenstrain, strain, scale):
    elastic_strain = strain-eigenstrain
    sigma = stress(stiffness, elastic_strain)
    energy_density = 0.5*np.sum(elastic_strain*sigma, axis=(-2,-1))
    residual = rms(grid.divergence(sigma))/scale
    return sigma, energy_density, residual


def result(grid, stiffness, eigenstrain, strain, displacement, scale, history, **extra):
    sigma, energy_density, residual = diagnostics(grid,stiffness,eigenstrain,strain,scale)
    return dict(strain=strain, displacement=displacement, stress=sigma,
                energy_density=energy_density, energy=float(energy_density.mean()),
                residual=residual, history=np.asarray(history), **extra)


def plate_problem(size=65, contrast=0.5, angle=30.0, misfit_ratio=-0.5,
                  matrix_constants=(4.,2.,1.), precipitate_constants=None):
    """A smooth periodic plate. angle is its long-axis angle from x, in degrees.
    Rotate the shape, keeping stiffness and physical eigenstrain crystal-fixed.
    Optional independent precipitate_constants override scalar contrast.
    """
    PeriodicGrid(size)
    matrix = cubic(*matrix_constants)
    precipitate = cubic(*(np.asarray(matrix_constants)*contrast if precipitate_constants is None else precipitate_constants))
    x,y = np.meshgrid(np.arange(size)/size-.5,np.arange(size)/size-.5,indexing='ij')
    theta = np.deg2rad(angle)
    along = x*np.cos(theta)+y*np.sin(theta)
    across = -x*np.sin(theta)+y*np.cos(theta)
    radius_squared = (along/.23)**2+(across/.075)**2
    # Smooth fixed interface width in physical coordinates, not in pixels.
    phase = .5*(1-np.tanh((radius_squared-1)/.35))
    stiffness = matrix+phase[...,None,None,None,None]*(precipitate-matrix)
    eigenstrain = phase[...,None,None]*np.diag([.01,.01*misfit_ratio])
    reference = .5*(matrix+precipitate)
    return stiffness,eigenstrain,reference,phase


def plot_solution(solution, phase):
    """Plot geometry, physical fields and residual, with readable rainbow maps."""
    import matplotlib.pyplot as plt
    figure, axes = plt.subplots(1,4,figsize=(15,3.5),layout='constrained')
    for axis,field,title in zip(axes[:3], [phase,solution['stress'][...,0,0],solution['energy_density']],
                               ['Precipitate fraction h',r'$\sigma_{xx}$','Elastic energy density']):
        image=axis.imshow(field.T,origin='lower',extent=[0,1,0,1],cmap='rainbow')
        axis.set(title=title,xlabel='x',ylabel='y')
        figure.colorbar(image,ax=axis,shrink=.8)
    history=solution['history']
    axes[3].semilogy(history[:,0],np.maximum(history[:,1],1e-16))
    axes[3].set(xlabel='Iteration',ylabel='Equilibrium residual',title='Convergence')
    return figure
