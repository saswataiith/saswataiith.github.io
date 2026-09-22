# Source equations and independent verification

This is a teaching adaptation, not a verbatim transcription. The equations were checked against the rendered PDF pages as well as extracted text. References retain their original notation; implementation conventions and any necessary clarifications are stated below.

## Homogeneous elastic energy: Saswata's appendices

Saswata Bhattacharya, *Evolution of Multivariant Microstructures with Anisotropic Misfit: A Phase Field Study*, Appendix A, pp. 107–111, Eqs. A.1–A.12; Appendix B, pp. 112–114, Eqs. B.1–B.12. The underlying book is A. G. Khachaturyan, *Theory of Structural Transformations in Solids*, Wiley, 1983 (thesis reference 4).

Appendix A starts from one half of the integral of elastic stress times elastic strain, separates homogeneous and periodic strain, and evaluates the six energy terms. At zero applied mean stress with homogeneous stiffness, the mean strain equals the mean eigenstrain. The mean energy cancels. Substitution of mechanical equilibrium gives Eq. A.12:

    B_pq = C_ijkl epsilon_ij^(p) epsilon_kl^(q)
           - n_j sigma_ij^(p) Omega_ki sigma_kl^(q) n_l.

B_pq is the **elastic energy kernel**. It is not a modulus and is not itself the total elastic energy. Spectral field amplitudes, integration weights, and the factor 1/2 supply the energy. The prime on the integral excludes k=0 under the thesis's relaxed mean-strain assumption.

The plate module fixes the mean total strain to zero. Consequently it retains the mean elastic energy. The same B applies to nonzero homogeneous modes, but copying the appendix's zero-mode omission would change this experiment's boundary condition.

Appendix B differentiates both factors in the quadratic energy. Symmetry B_aq=B_qa makes their contributions equal. With a fixed field label a, the result is g_hat_a=sum_q B_aq theta_hat_q; a is not summed. The wording immediately before B.12 prints B_pi=B_iq, and intermediate expressions include the selected index in summation notation. The laboratory writes B_pa=B_ap and renames dummy indices explicitly. It preserves the resulting derivative, not the ambiguous index labels. For theta_a=eta_a^2, the derivative is 2 eta_a g_a in real space.

## Inhomogeneous elasticity: the CICP paper

Saswata Bhattacharyya, Tae Wook Heo, Kunok Chang and Long-Qing Chen, *A Spectral Iterative Method for the Computation of Effective Properties of Elastically Inhomogeneous Polycrystals*, Communications in Computational Physics 11(3), 726–738 (2012). DOI: https://doi.org/10.4208/cicp.290610.060411a

Equations 2.6–2.11 establish stress, mechanical equilibrium, and the reference-modulus split. Equations 2.12–2.14 describe spectral iteration. Equations 2.15–2.16 distinguish fixed mean strain from a relaxing mean strain.

With Fourier convention d_j -> i k_j and C=Cref+DeltaC:

    Cref_ijkl u_k,lj = d_j P_ij
    P_ij = C_ijkl(epsilon0_kl-E_kl) - DeltaC_ijkl u_k,l
    Q_ik(n) = Cref_ijkl n_j n_l
    u_hat_k = -i |k|^-2 (Q^-1)_ki k_j P_hat_ij, k != 0.

**Green-tensor normalization.** As printed, the paper defines G^-1 using unit n, while Eqs. 2.13–2.14 write G(n) k_j without an explicit |k|^-2. For that stated definition the factor is required by Fourier transformation of Eq. 2.12. Equivalently, define the full wavevector Green tensor as [Cref_ijkl k_j k_l]^-1 and do not add another factor. The code uses the latter through `inverseAcoustic`. The independent sinusoidal-mode test checks the 1/|k| displacement scaling, including 2*pi for a unit box.

**Mean strain.** Eq. 2.16 explicitly defines its compliance-like object as the inverse of the average stiffness, not the average of local compliances. In full indices:

    <C_ijkl> E_kl = sigmaApplied_ij + <C_ijkl epsilon0_kl>
                    - <C_ijkl deltaEpsilon_kl>.

The inverse is on symmetric tensors. The current laboratory prescribes E=0, so it does not solve this extra mean-strain equation. For nonzero applied stress, stationarity is taken for the elastic energy minus the external-work term V sigmaApplied:E; the stored elastic energy alone is not the full fixed-stress potential. Eq. 2.15 prints the stored elastic energy.

**Implementation distinction.** The browser uses preconditioned conjugate gradients to solve the full heterogeneous equilibrium equation. The CICP reference is not presented as if its iteration were identical to PCG. The validation file implements a separate fixed-point spectral iteration with a midpoint reference stiffness and compares complete displacement fields for soft and hard anisotropic phases. These selected cases converge; this is not a claim of unconditional fixed-point convergence or a reproduction of all the paper's polycrystal benchmarks.

## Tushar Jogi's thesis: checks on compact notation

Tushar Jogi, *Computational Modeling and Simulations of Process-Microstructure-Property Relations in Model Ni-base Superalloys*, IIT Hyderabad, September 2021. Relevant locations: Eqs. 3.17–3.20, 3.42–3.51, 3.58–3.60; Appendix B, pp. 181–182.

- **Eq. 3.48:** the text defines S(r)=C(r)^-1 and the equation uses <S(r)>. For the mean-strain equilibrium derived above, the required object is <C(r)>^-1, generally unequal to <C(r)^-1>. The laboratory follows the CICP definition and the direct indicial derivation.
- **Eq. 3.49:** the rendered equation lacks a clear subtraction between C:(epsilon0-E) and C':grad(u). Eq. 3.60 includes this subtraction. The indicial balance above fixes the sign independently.
- **Eqs. 3.59–3.60:** the direction-only Green tensor has the same wave-number normalization issue described above. Also, an unqualified double contraction C:(n tensor n) can leave the wrong free index pair under the usual convention. We explicitly form Q_ik=C_ijkl n_j n_l.
- **Appendix B:** intermediate expansion lines contain inconsistent primes, a remaining delta-phi and prefactors. The final first-order result has the expected form when epsilon0-prime and B-prime mean derivatives with respect to phi. The laboratory re-derives the first variation in indices rather than copying these intermediate lines.

At mechanical equilibrium, under fixed displacement/mean-strain boundary conditions, the displacement contribution to the first variation vanishes. Thus:

    delta F_el/delta phi = (1/2) e_ij (dC_ijkl/dphi) e_kl
                          - sigma_ij (d epsilon0_ij/dphi).

The stiffness term must not be omitted in an inhomogeneous model. The scalar interpolation B(phi) used by Tushar is unrelated to the elastic energy kernel B_pq(n). The laboratory names its interpolation h to avoid that collision.

## Verification recorded in validation-results.json

The original nine groups remain. Additional checks compare the compact kernel to a literal four-index contraction including shear, verify Mohr-circle invariants and zero-extension cases, verify Fourier wave-number scaling analytically, compare PCG against the separately implemented CICP-style iteration, and compare the homogeneous/inhomogeneous driving forces to central differences of fully re-equilibrated energies.

These checks establish consistency for the documented cases. They do not validate arbitrary contrast, zero stiffness, finite rotations, 3-D compatibility, or a traction-free inhomogeneous solver. The tool remains small-strain, two-dimensional and prescribed-shape.
