# Elastic Stress Effects Laboratory: formulation before implementation

## Scope and conventions
This release studies prescribed eigenstrains and fixed shapes, not time-evolving morphology. x=[10], y=[01]. All directions on the page have two indices. Strains are symmetric tensors; the third stored component is tensor shear epsilon_xy, not engineering shear. The 2-D constitutive law is sigma_xx=C11 e_xx+C12 e_yy, sigma_yy=C12 e_xx+C11 e_yy, sigma_xy=2 C44 e_xy. It is an in-plane model using the cubic (001) stiffness sub-block, with no imposed out-of-plane eigenstrain. It is not a plane-stress reduction of a fully 3-D dilatational transformation. Stable cubic inputs obey C44>0, C11-C12>0, C11+2 C12>0.

Module I: n(theta) is an arbitrary measurement direction. epsilon_nn/epsilon_eta=cos²(theta)+t sin²(theta). At a root that measurement direction becomes the habit-line tangent s. Its normal m is rotated 90 degrees. For t<0, theta=atan2(1,sqrt(-t)) and pi-theta. At t=0 theta=pi/2. For t>0 no roots. For t=-1 roots are 45 and 135 degrees. The acute interface-normal angle is atan(sqrt(-t)). Eq 4.10 of Saswata's thesis labels the latter as a line angle from x; the tool states the discrepancy explicitly rather than silently swapping axes.

A zero tangential strain permits a rank-one displacement-gradient jump in the 2-D small-strain setting: epsilon0=sym(a tensor m), after allowing a rigid rotation. This is the compatibility argument for an ideal infinite thin plate, not an assertion that every zero normal-strain direction has zero total elastic energy. Finite plates and interfaces add constraints and costs.

## Homogeneous kernel: Appendix A
Primary derivation: Saswata’s Appendix A, Eqs. A.1–A.12, pp. 107–111. The elastic driving force follows Appendix B, Eqs. B.1–B.12, pp. 112–114, with the selected field index kept free. See SOURCE-AUDIT.md for the derivation and notation checks.

sigma0_p=C:epsilon0_p; Q_ik=C_ijkl n_j n_l; a_p=sigma0_p n.
B_pq=epsilon0_p:C:epsilon0_q-a_p dot Q^-1 a_q.
Compute each p,q independently. B_pq=B_qp; the matrix is positive semidefinite, but cross entries can be negative. A sign change epsilon0_q -> -epsilon0_q flips B_pq and leaves B_qq unchanged.

Reference: Sandeep Sugathan thesis, Eqs 3.22 and 3.27-29, Eq 5.1, Tables 5.1-5.2 pp116, Fig5.18 pp133, discussion pp132. G=2000, nu=1/3, AZ=3 gives C11=7000,C12=5000,C44=3000. X2: beta=.01 I, gamma=-.01 I. X3: beta=.01265 I, gamma=-.00632 I. The numerical reproduction gives self values 12/35 on the axes and 0.8 on diagonals, with cross values of the opposite sign. These match Fig. 5.18. This verifies the stated 2-D convention; it does not reproduce the full evolving ternary microstructure.

## Pair energy
Use identical smooth circular Gaussian composition profiles in a periodic square. Evaluate E_int=E(beta+gamma)-E(beta)-E(gamma) via the Fourier bilinear cross term including cos(k dot R). This sum includes shape spectrum and separation; it is not B evaluated at the separation angle. Report box size, radius and distance. Periodic copies remain part of the calculation. Positive E_int is a cost relative to isolated profiles in the same periodic box. Negative E_int is a reduction. No claim of isolated infinite-medium interactions.

## Inhomogeneous plate solver
Reference equilibrium: the CICP paper (2012), Eqs. 2.6–2.16; associated phase-field driving force: Tushar Jogi’s thesis, Appendix B. The browser solves these equilibrium equations using PCG, separately checked against a CICP-style spectral fixed-point iteration. SOURCE-AUDIT.md records the Green-tensor wave-number factor, mean-stiffness inverse, and exact indicial contractions.

Prescribe one smooth elliptic plate in a periodic unit square, with a fixed volume fraction and crystal-frame eigenstrain. Interpolate C(x)=(1-h)Cm+hCp and epsilon0(x)=h epsilon_p. Minimize F=mean[epsilon_el:C(x):epsilon_el]/2 over periodic displacement u, at fixed mean total strain zero. This is a clamped macroscopic boundary condition, not zero average stress. Rotate the shape, not the crystal axes or eigenstrain.

Use spectral symmetric gradients and their exact discrete adjoints, then preconditioned conjugate gradients for A u=b, A=D* C(x) D, b=D* C(x) epsilon0. The homogeneous reference modulus acoustic inverse preconditions the solve. The mean displacement is fixed to zero. Real spectral derivatives set Nyquist derivatives to zero on even grids; their null modes are excluded from displacement and retained in unrelaxed eigenstrain energy. Smooth masks and grid convergence control their contribution. Never use a single homogeneous B for nonuniform C.

Reference energy for homogeneous C is evaluated independently in Fourier space by eliminating displacement mode by mode, including the k=0 clamped term. Validate the real-space solver against this reference. Report relative residual, iteration limit, energy and convergence; reject failed solves in orientation scans. A finite sampled minimum is not a proof of a global continuum optimum. Compare 32/64/128 grids and 5/2.5 degree angle steps; expose this limitation.

## Sources and licensing
Saswata Bhattacharya thesis: Chapter3 Eq3.2 and Chapter4 Eq4.10, Fig4.4. Sandeep Sugathan: A Phase-Field Study of Elastic Stress Effects on Phase Separation in Ternary Alloy Systems, IIT Hyderabad, June 2019, Chapters 3 and 5 above. Existing website elastic appendix supplies the homogeneous derivation. New laboratory code: GPL-3.0-or-later. Existing website template remains MIT; thesis figures retain their authors' rights. Do not redistribute full theses.
