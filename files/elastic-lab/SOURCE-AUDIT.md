# References and notation

I use equations from my teaching and research, together with the references below, to calculate elastic fields in this laboratory. This note explains how the notation in those sources corresponds to the code. The numerical checks compare independently calculated results for specified cases.

## Common quantities

Elastic stiffness C relates elastic strain e to stress sigma. Total strain is epsilon, eigenstrain is epsilon0, and e = epsilon - epsilon0. Eigenstrain is the strain a region would adopt if it were free to deform.

Strains are dimensionless. In physical units, stiffness and stress are in pascals, and elastic energy density is in joules per cubic metre. These units are equivalent because one pascal is one joule per cubic metre. The laboratory examples use a common scaled energy-density unit rather than values for a specified material.

Component indices i, j, k and l refer to Cartesian directions. Repeated component indices are summed. A colon denotes summation over matching tensor components. Phase labels p, q and a identify phases or fields; a selected phase label is kept fixed when a derivative is calculated.

## My PhD thesis: homogeneous elastic constants

Reference: Saswata Bhattacharyya, *Evolution of Multivariant Microstructures with Anisotropic Misfit: A Phase Field Study*, Appendix A, pp. 107–111, Eqs. A.1–A.12; Appendix B, pp. 112–114, Eqs. B.1–B.12. The underlying method is described in Khachaturyan's *Theory of Structural Transformations in Solids* (Wiley, 1983), Chapter 7, particularly sections 7.2 and 7.3.

Appendix A starts from elastic energy F = integral of sigma:e/2. It separates average strain from the periodic strain variation and then uses mechanical equilibrium to eliminate displacement. The result for each nonzero Fourier mode contains the elastic coefficient:

```text
B_pq = C_ijkl epsilon0_ij^(p) epsilon0_kl^(q)
       - n_j sigma0_ij^(p) Omega_ki sigma0_kl^(q) n_l
```

Here n is the unit Fourier direction, sigma0^(p) = C:epsilon0^(p) is the eigenstress of phase p, and Omega is the inverse acoustic matrix. Its inverse is Q_ik = C_ijkl n_j n_l. Omega has inverse-stiffness units. B_pq has energy-density units. The first term is the unrelaxed contribution; the second is the reduction due to elastic relaxation.

B_pq is an energy coefficient, not a modulus or a complete particle energy. To obtain the energy, it must be multiplied by the appropriate Fourier field amplitudes, summed or integrated over wavevectors, and combined with the factor 1/2.

The average-strain boundary condition matters. In the homogeneous, zero-average-stress calculation in the thesis, average total strain equals average eigenstrain and the mean elastic contribution vanishes. The prime on the Fourier integral excludes the zero wavevector. Module V instead fixes average total strain at zero, so it retains the mean elastic energy. Omitting that term would change the boundary condition.

### The energy derivative in Appendix B

Differentiating the quadratic energy gives two equal contributions because B_aq = B_qa. For a selected field a:

```text
g_hat_a = sum over q of B_aq theta_hat_q
```

The hat denotes a Fourier transform. theta_q is a dimensionless phase field. The quantity g_a is the elastic energy derivative with respect to theta_a, with energy-density units. The label a is fixed, and only q is summed. If theta_a = eta_a², the derivative with respect to the dimensionless order parameter eta_a is 2 eta_a g_a in real space.

The code uses explicit phase labels when implementing Appendix B. This avoids ambiguity in the compact index notation around Eq. B.12. The checks compare the implemented derivative with a small-change calculation of the equilibrated energy.

## The 2012 paper: stiffness that varies with position

Reference: Saswata Bhattacharyya, Tae Wook Heo, Kunok Chang and Long-Qing Chen, [*A Spectral Iterative Method for the Computation of Effective Properties of Elastically Inhomogeneous Polycrystals*](https://doi.org/10.4208/cicp.290610.060411a), Communications in Computational Physics 11(3), 726–738 (2012).

Equations 2.6–2.11 give stress, mechanical equilibrium and the separation into reference stiffness and stiffness variation. Equations 2.12–2.14 give the Fourier iteration. Equations 2.15–2.16 describe the energy and average strain. In the code notes, CICP is an abbreviation for this journal.

Write C = Cref + DeltaC, where Cref is a spatially uniform reference stiffness and DeltaC is the local difference. Let E be average total strain, and u the periodic displacement fluctuation. The stress-like field P used in the iteration is:

```text
P_ij = C_ijkl(epsilon0_kl - E_kl) - DeltaC_ijkl u_k,l
Cref_ijkl u_k,lj = derivative of P_ij with respect to x_j
```

A comma denotes differentiation: u_k,l means derivative of displacement component k with respect to coordinate l. P has stress units. Cref and DeltaC have stiffness units. The derivatives of u are dimensionless strains or displacement gradients.

### Fourier wavevector factors

Let k be the Fourier wavevector, with inverse-length units, and n = k divided by the magnitude of k its unit direction. A spatial derivative becomes multiplication by i k_j, where i is the imaginary unit. Define Q_ik(n) = Cref_ijkl n_j n_l. For a nonzero wavevector:

```text
u_hat_k = -i |k|^-2 inverse(Q)_ki k_j P_hat_ij
```

The subscript k on u here is a Cartesian component label; the vector k in the same expression is the wavevector. The two uses follow the source's index notation.

If a Green tensor is defined using the unit direction n, the inverse-square wave-number factor must remain explicit. If it is instead defined as the inverse of Cref_ijkl k_j k_l, that factor is already included. These are equivalent definitions, but their factors must not be mixed. The code uses the full-wavevector definition in `inverseAcoustic`. The numerical check verifies that doubling the wave number halves the displacement amplitude for the specified sinusoidal input.

### Average stiffness and average strain

Angle brackets mean a spatial average. When average stress is prescribed, the mean-strain equation uses the inverse of the average stiffness:

```text
<C_ijkl> E_kl = sigmaApplied_ij + <C_ijkl epsilon0_kl>
               - <C_ijkl deltaEpsilon_kl>
```

Here sigmaApplied is the prescribed average stress, and deltaEpsilon is the zero-mean strain fluctuation. The inverse of average stiffness generally differs from the average of local inverse stiffnesses. Equation 2.16 uses the first quantity.

Module V prescribes E = 0 and therefore does not solve this additional mean-strain equation. At prescribed average stress, the potential minimized must also include the external-work term. Stored elastic energy alone is not that fixed-stress potential.

### Which solver is used in the browser?

The browser uses preconditioned conjugate gradients, or PCG, to solve the discretized equilibrium equations. The comparison program uses a separate Fourier fixed-point iteration based on the paper. A fixed-point iteration repeatedly calculates a new displacement from the previous displacement and checks whether the result has stopped changing.

The tests compare complete displacement fields for selected soft and hard anisotropic inclusions. Agreement between two implementations is a useful check. It does not establish convergence of the fixed-point method for every stiffness contrast, or reproduce every polycrystal example in the paper.

## Tushar's thesis: notation used in this implementation

Reference: Tushar Jogi, *Computational Modeling and Simulations of Process-Microstructure-Property Relations in Model Ni-base Superalloys*, IIT Hyderabad, September 2021. Relevant equations are 3.17–3.20, 3.42–3.51 and 3.58–3.60, with the elastic derivative in Appendix B, pp. 181–182.

The laboratory writes out the component equations to make the following choices explicit:

- **Average strain, Eq. 3.48:** the mean-strain equation requires the inverse of the average stiffness, as in the 2012 paper. This is generally different from the average of the local inverse stiffnesses.
- **Iteration sign, Eqs. 3.49 and 3.60:** the field P contains C:(epsilon0 - E) minus DeltaC:grad(u). The subtraction follows directly from mechanical equilibrium.
- **Acoustic matrix, Eqs. 3.59–3.60:** the code forms Q_ik = C_ijkl n_j n_l explicitly. This identifies the two matrix indices and avoids an ambiguous tensor contraction. The wavevector factors follow the definition above.
- **Energy derivative, Appendix B:** the code differentiates stiffness and eigenstrain separately. A prime denotes a derivative with respect to the relevant phase field, not a spatial derivative.

At mechanical equilibrium and fixed displacement or average strain, the local elastic energy derivative with respect to a dimensionless field phi is:

```text
dF_elastic/dphi = (1/2) e_ij (dC_ijkl/dphi) e_kl
                  - sigma_ij (d epsilon0_ij/dphi)
```

This is a functional derivative with energy-density units. The first term accounts for changing stiffness. The second accounts for changing eigenstrain. A model with spatially varying stiffness needs both terms. Changes in the equilibrated displacement do not contribute to this first variation under the stated boundary conditions.

Tushar's scalar interpolation called B(phi) is different from the coefficient B_pq(n). The laboratory calls the interpolation h to keep the two quantities distinct.

## Sandeep's thesis and the stiffness conversion

Reference: Sandeep Sugathan, *A Phase-Field Study of Elastic Stress Effects on Phase Separation in Ternary Alloy Systems*, IIT Hyderabad, June 2019. Chapter 3, Eqs. 3.23–3.29 give the averaged elastic parameters and their conversion to cubic stiffnesses. Chapter 5, Tables 5.1–5.2 and Fig. 5.18 give the ternary-alloy examples used in Module IV.

The conversion follows [I. Schmidt and D. Gross (1997)](https://doi.org/10.1016/S0022-5096(97)00011-2). The mu, nu and AZ definitions and the stability restriction are given in `FORMULATION.md`. The tests check conversion in both directions and the positive-definite boundary.

For the X2 example, the checks reproduce the two self coefficients and the cross coefficient, including their signs and directional minima. The particle-pair calculation is a separate example. It is not a rerun of the thesis phase-separation simulation.

## What the checks establish

The numerical report contains 20 groups of checks. These compare the elastic coefficients and derivatives with independently calculated expressions, check strain rotations, compare two equilibrium solvers, test the ellipse solution and interface conditions, and compare selected spatial and angular resolutions.

Each successful check applies to the inputs and tolerance used in that check. The tests do not establish accuracy for arbitrary stiffness contrast or particle shape. The laboratory remains a small-strain, in-plane calculation with prescribed shapes. The readable results page explains the comparisons, and the JSON file retains the numerical values.
