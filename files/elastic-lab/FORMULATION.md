# Equations and assumptions

I use the following equations to calculate stress and elastic energy in this laboratory. This note defines the quantities, describes each calculation and states its boundary conditions.

## Quantities and units

| Quantity | Meaning | Physical units |
| --- | --- | --- |
| u | Displacement from the reference position | metre |
| epsilon | Total strain, obtained from the symmetric displacement gradient | dimensionless |
| epsilon0 | Eigenstrain: the strain a region would adopt if it were free to deform | dimensionless |
| e = epsilon - epsilon0 | Elastic strain | dimensionless |
| sigma | Stress | pascal |
| C | Elastic stiffness tensor, which relates elastic strain to stress | pascal |
| w | Elastic energy per volume | joule per cubic metre |
| F | Total elastic energy | joule |
| n | Unit vector specifying a direction | dimensionless |
| k | Fourier wavevector; its magnitude is 2 pi divided by wavelength | inverse metre |

One pascal equals one joule per cubic metre. The website examples use scaled model values rather than a specified material. Stiffness and energy density therefore share the same model scale. Lengths in periodic calculations are measured relative to the box width. Two-dimensional energies are interpreted per unit thickness; an energy divided by the box area has the corresponding energy-density scale.

The symbols i, j, k and l used as subscripts identify Cartesian components. Repeated component indices are summed. A colon means summation over matching tensor components. For example, sigma:e means the sum of sigma_ij e_ij. In two dimensions this includes twice the shear contribution sigma_xy e_xy.

The basic elastic relations are:

```text
sigma = C:e
w = (1/2) e:C:e
F = integral of w over the body
```

The in-plane constitutive equations are:

```text
sigma_xx = C11 e_xx + C12 e_yy
sigma_yy = C12 e_xx + C11 e_yy
sigma_xy = 2 C44 e_xy
```

The code stores symmetric strains as `[xx, yy, xy]`. The last entry is tensor shear strain. Engineering shear strain is twice that entry. The calculations use the cubic (001) in-plane stiffness components, with no imposed out-of-plane eigenstrain. They are not a plane-stress reduction of a general three-dimensional transformation.

## Module 0: elastic stability and stiffness conversion

For cubic stiffness, C11 relates an axial elastic strain to stress along the same axis. C12 couples a normal strain along one axis to stress along another. C44 gives the response to engineering shear in a principal plane.

A positive-definite stiffness gives positive elastic energy for every nonzero elastic strain. For an unstressed cubic crystal, the necessary and sufficient conditions are:

```text
C11 - C12 > 0
C11 + 2 C12 > 0
C44 > 0
```

The normal-strain block has one eigenvalue C11 + 2 C12 and two eigenvalues C11 - C12. The three engineering-shear entries are C44. A zero value gives a marginal deformation mode; a negative value gives a mode whose quadratic elastic energy is negative.

The bulk modulus K = (C11 + 2 C12)/3 measures resistance to uniform volume change. The Zener ratio AZ = 2 C44/(C11 - C12) measures cubic elastic anisotropy. AZ = 1 gives an isotropic cubic elastic tensor.

The energy graph applies a dimensionless strain amplitude q in three ways:

| Deformation | Nonzero strain components | Energy density |
| --- | --- | --- |
| Uniform dilation | epsilon_xx = epsilon_yy = epsilon_zz = q | 3(C11 + 2 C12)q²/2 |
| Tetragonal distortion | epsilon_xx = q, epsilon_yy = -q | (C11 - C12)q² |
| Simple shear | engineering shear gamma_xy = q | C44 q²/2 |

The Schmidt–Gross conversion uses an average shear parameter mu and an effective Poisson parameter nu. Here mu is the angular average of rotated C1212 in the (001) plane. If Lambda is the corresponding average of rotated C1122, then nu = Lambda/[2(Lambda + mu)]. The parameter mu has stiffness units; nu and AZ are dimensionless. These averages do not describe the response in every direction of an anisotropic crystal.

```text
C11 = mu [2(2 + AZ)/(1 + AZ) - (1 - 4 nu)/(1 - 2 nu)]
C12 = mu [2 AZ/(1 + AZ) - (1 - 4 nu)/(1 - 2 nu)]
C44 = 2 mu AZ/(1 + AZ)
```

For positive mu and AZ and nu < 1/2, stability also requires 1 + 3 AZ + 4 nu > 0. This follows by substituting the conversion into C11 + 2 C12. The usual isotropic range for nu alone does not ensure stability at every AZ.

Module IV keeps nu = 1/3 in its conversion panel. The other panels allow nu to change. Direct stiffness inputs remain independent within each module.

The page also gives the hexagonal, tetragonal I and orthorhombic stability conditions. These concern unstressed, small-strain elastic stability. They are not a complete test of lattice vibrations or stability under finite applied stress.

References: Sandeep's thesis, Chapter 3, Eqs. 3.23–3.29; [Schmidt and Gross (1997)](https://doi.org/10.1016/S0022-5096(97)00011-2); [Mouhat and Coudert (2014)](https://arxiv.org/abs/1410.0065). Nye's *Physical Properties of Crystals* explains the tensor representation of elastic constants.

## Module I: the zero-extension line

The prescribed eigenstrain is epsilon0 = epsilon_eta diag(1,t). The scale epsilon_eta is dimensionless. The ratio t is the y eigenstrain divided by the x eigenstrain. For a measurement direction at angle theta from x (in radians in the formula; degrees in the controls):

```text
epsilon0_nn / epsilon_eta = cos²(theta) + t sin²(theta)
```

A zero of this expression identifies a line with no extension under the prescribed eigenstrain. For t < 0, the two directions are theta = atan2(1,sqrt(-t)) and pi - theta. At t = 0 the line is along y. For t > 0 there is no zero-extension line of this type. For example, t = -1 gives 45 and 135 degrees.

The interface normal is perpendicular to the line. In the ideal two-dimensional thin-plate compatibility argument, a rigid rotation can accommodate the remaining displacement-gradient difference. This geometric condition depends on eigenstrain. The additional energy at zero total strain depends on stiffness as well. A finite particle may still have elastic and interfacial energy.

My thesis, Chapter 3, Eq. 3.2, and Chapter 4, Eq. 4.10, use different wording for the line and normal angles. The laboratory states which direction each angle describes. The acute normal angle is atan(sqrt(-t)); it is not the line angle measured from x.

## Module II: an elliptical inclusion

The inclusion has uniform eigenstrain and the same elastic stiffness as its surrounding matrix. Its semi-axis lengths are a and b, measured in length units, and its long axis makes angle phi with x. The code uses radians; the controls show degrees. In the infinite-matrix solution, strain inside the ellipse is uniform. Strain outside varies with position.

For a unit direction n, define the acoustic matrix Q and the eigenstress sigma0:

```text
Q_ik = C_ijkl n_j n_l
sigma0 = C:epsilon0
g(n) = inverse(Q) sigma0 n
```

The vector g is dimensionless. The interior displacement gradient D is the angular average of g(n) tensor n. The integration direction n is parallel to the rotated vector `(cos(theta)/a, sin(theta)/b)`. Here theta is the integration angle, and the rotation is by phi. The tensor product g tensor n has components g_i n_j. The symmetric part of D, obtained by averaging D with its transpose, gives the interior total strain. The antisymmetric part gives the local rigid rotation.

```text
epsilon_inside = (D + transpose(D))/2
sigma_inside = C:(epsilon_inside - epsilon0)
energy per inclusion volume = -(1/2) sigma_inside:epsilon0
```

The last expression is the total elastic energy of the inclusion and surrounding matrix divided by the inclusion volume. It is not simply the local energy density inside the inclusion. In this two-dimensional calculation, it is also described as energy per inclusion area per unit thickness. The angular integration uses 4096 samples for the selected state and 2048 samples for the orientation and aspect-ratio plots.

At an interface point, let m be the outward unit normal and s the unit tangent. The one-sided exterior strain is:

```text
epsilon_outside = epsilon_inside - sym(g(m) tensor m)
sigma_outside = C:epsilon_outside
```

Here sym means the symmetric part. The jump is the inside value minus the outside value. Displacement continuity requires the tangential total strain epsilon_ss to be continuous. Mechanical equilibrium requires the traction sigma m to be continuous, so sigma_sm and sigma_mm agree on both sides. Other strain components and sigma_ss can jump.

The profiles use separate interior and exterior solutions and terminate at their one-sided interface values. A connector indicates a real jump; it does not interpolate across it. As the ellipse becomes a thin plate, its energy approaches B(m)/2, where m is the plate normal and B is the self elastic coefficient defined below.

The colour map instead uses a periodic square with 256, 512 or 1024 grid points in each direction. It fixes average total strain at zero and includes periodic copies. Its default long semi-axis is 0.16 times the box width. The map limits b/a to at least 0.08 so a very thin shape remains resolved. Fourier oscillations near a sharp interface can remain. The map and the infinite-matrix profiles have different boundary conditions and need not match exactly.

Reference: Mura, *Micromechanics of Defects in Solids*, section 11. The check program compares the isotropic ellipse solution with Mura's closed expression and separately checks interface continuity and the thin-plate limit.

## Modules III and IV: self and cross elastic coefficients

The phase labels p and q identify the two eigenstrains in a calculation. For each phase, define its eigenstress sigma0_p = C:epsilon0_p and the vector a_p = sigma0_p n. With homogeneous stiffness:

```text
B_pq(n) = epsilon0_p:C:epsilon0_q - a_p dot inverse(Q) a_q
```

B_pq has energy-density units for dimensional stiffnesses. It describes the elastic contribution associated with a Fourier mode; it is not the total particle energy. The first term is the unrelaxed contribution. The second is the energy removed by elastic displacement relaxation.

When p = q, the result is a self coefficient. When p and q differ, it is a cross coefficient. Symmetry gives B_pq = B_qp. The matrix of coefficients is positive semidefinite for stable stiffness, although a cross entry can be negative. Reversing one phase's eigenstrain reverses its cross coefficient and leaves its self coefficient unchanged.

Module III plots one self coefficient. Its polar radius is proportional to B_pp, with zero at the centre. Module IV displays B_beta,beta, B_gamma,gamma and B_beta,gamma separately. Its polar panels use a common labelled offset because the cross coefficient can be negative.

Sandeep's X2 example uses mu = 2000, nu = 1/3 and AZ = 3, giving C11 = 7000, C12 = 5000 and C44 = 3000. The in-plane misfits are +0.01 for beta and -0.01 for gamma. Both self coefficients are 0.342857 along the axes and 0.8 along the diagonals. The cross coefficient has the corresponding negative values. These reproduce the coefficients in Chapter 5, Fig. 5.18; they do not reproduce a complete evolving microstructure.

## Module IV: particle-pair interaction energy

The pair calculation uses two smooth circular Gaussian profiles in a periodic square. The interaction energy is the difference between the combined elastic energy and the sum of the separate energies:

```text
E_interaction = E_both - E_beta - E_gamma
```

The calculation sums the cross contributions from all Fourier modes, including the separation factor cos(k dot R). R is the vector joining the particle centres, measured in length units. The product k dot R is dimensionless. Profile size, separation and periodic copies affect the result. B_pq at a single direction is not this particle-pair energy.

A negative interaction energy lowers the combined energy relative to the separate profiles in the same box. It does not make the total elastic energy negative. In the X2 example the beta–gamma pair has lower interaction energy along [11] than along [10]. Shape, composition and interfacial energy would also have to be considered in an evolving microstructure.

## Module V: a plate with different stiffness from the matrix

Let h(x) be a smooth dimensionless field that is approximately zero in the matrix and one inside the plate. The stiffness and eigenstrain are:

```text
C(x) = (1 - h) C_matrix + h C_plate
epsilon0(x) = h epsilon0_plate
```

The program finds the periodic displacement that minimizes elastic energy while keeping average total strain zero. The plate shape rotates; the crystal axes and eigenstrain remain fixed. The module calculates one plate at a time.

Spatial derivatives are calculated by fast Fourier transforms, abbreviated FFT. The discrete equilibrium equations are solved by preconditioned conjugate gradients, abbreviated PCG. The derivative and its adjoint are paired in the energy calculation; the adjoint is the corresponding operator obtained by discrete integration by parts. The reference acoustic matrix helps the iterative solver converge. The mean displacement is fixed to remove the arbitrary rigid translation.

On even grids, first derivatives set the Nyquist mode to zero. This is the highest sampled frequency, with wavelength two grid spacings. Its displacement null modes are excluded from the solve, while its unrelaxed eigenstrain energy is retained. Smooth profiles and resolution checks are therefore important.

For uniform stiffness, an independent Fourier calculation provides a reference energy. The tests compare that result with the displacement solver, including the mean elastic energy. For different stiffnesses, a single homogeneous coefficient B cannot replace the equilibrium solve.

The reported minimum is the lowest of the sampled angles. Repeat at finer spatial grids and smaller angle steps to assess its accuracy. A small energy difference may require substantially finer calculations.

## Sharp interfaces and smoothly varying fields

For a sharp coherent interface, displacement and traction are continuous. The stiffness and eigenstrain can change abruptly. A smooth profile spreads this change over a specified width; it does not describe an automatically evolving interface.

A spatial profile h(d) = [1 - tanh(d/w)]/2 uses signed distance d from the interface and width parameter w. Both d and w have length units. This use of w is a width parameter, distinct from the energy-density symbol used above.

A phase-field interpolation instead depends on a dimensionless order parameter eta. Linear interpolation is a useful starting point for a physical phase fraction. Common alternatives are h = eta²(3 - 2 eta) and h = eta³(10 - 15 eta + 6 eta²). Their derivatives vanish at pure-phase endpoints; the quintic also has zero second derivatives there. The choice should match the physical meaning of eta.

If stiffness and eigenstrain depend on a dimensionless field phi, the elastic energy derivative at mechanical equilibrium is:

```text
dF_elastic/dphi = (1/2) e:(dC/dphi):e - sigma:(d epsilon0/dphi)
```

This expression denotes the local functional derivative, with energy-density units. Both terms are needed when stiffness varies. The first is the contribution from changing stiffness; the second is the contribution from changing eigenstrain. The field phi here is different from the ellipse orientation angle used in Module II.

## Average strain and average stress

A periodic displacement fluctuation does not determine the overall deformation of a cell. Write u = Ebar x + u_periodic. Ebar is the prescribed average total strain, x is position and u_periodic is the periodic displacement fluctuation. All strain components are dimensionless.

Under strain control, Ebar is prescribed and the calculation gives the average stress. Under stress control, the average stress is prescribed and Ebar must be solved for. A prescribed average stress does not mean that local stress is the same everywhere. Module V uses Ebar = 0.

A general linear elastic cell has average stress Sigma = C_effective:Ebar + Sigma0. C_effective is its effective stiffness and Sigma0 is the average stress due to eigenstrain at zero average total strain. Under stress control, solve this equation for Ebar. Mixed control prescribes some average strains and some average stresses.

For a film and substrate represented with a soft surrounding region, negligible stress in that region can approximate a free surface. Its thickness and stiffness must be checked. Exactly zero stiffness leaves some displacements undetermined. Average film stress should refer to the solid volume or a membrane force per length, rather than depend on the arbitrary surrounding volume. The present plate widget is not that film calculation.

## Sources

My PhD thesis, *Evolution of Multivariant Microstructures with Anisotropic Misfit: A Phase Field Study*, Chapter 3, Eq. 3.2; Chapter 4, Eq. 4.10 and Fig. 4.4; Appendices A and B.

Sandeep Sugathan, *A Phase-Field Study of Elastic Stress Effects on Phase Separation in Ternary Alloy Systems*, IIT Hyderabad, June 2019, Chapters 3 and 5, especially Tables 5.1–5.2 and Fig. 5.18.

Bhattacharyya, Heo, Chang and Chen, [*A Spectral Iterative Method for the Computation of Effective Properties of Elastically Inhomogeneous Polycrystals*](https://doi.org/10.4208/cicp.290610.060411a), Communications in Computational Physics 11, 726–738 (2012).

Tushar Jogi, *Computational Modeling and Simulations of Process-Microstructure-Property Relations in Model Ni-base Superalloys*, IIT Hyderabad, 2021, sections 3.1.4–3.1.6 and Appendix B. See `SOURCE-AUDIT.md` for notation details and the independent comparisons.
