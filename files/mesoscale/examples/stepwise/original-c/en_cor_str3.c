void En_Cor_Str3 (char *fncave, char *outstring, int n_cluster) {
   
   // Calculates from the instantaneous configuration, the system energy,
   // the correlation function and structure function.
   // Assumes that a. comp is in k-space, and 
   //              b. dfdc, which has the same info, is in r-space.
   // This version also calculates the area, A, of the B-rich phase,
   // and the perimeter P between the phases. P is defined operationally 
   // using P = n * del_x, where n is the number of times composition 
   // profile crosses 0.5 in both dimensions, and del_x is the grid spacing.
   // 
   int i, j, bin_indx;
   int in, je;     
   int n_B_rich, n_interface;
   double area_B, perimeter;
   double del_kx, del_ky, kx, ky, kxpow2, kypow2, rx, ry;
   double energy, comp_dev;
   double tc, tp1, tp2, tq11, tq22, tq12;  // a bunch of temporary variables.
   double k1, k_int;
   double str_ave[nx], cor_ave[nx];
   int    str_n[nx], cor_n[nx];
 
   fftw_complex q11[nx][ny], q22[nx][ny], q12[nx][ny];
   fftw_complex p1[nx][ny], p2[nx][ny];
   
   FILE *fpcave;

   if (!(fpcave = fopen(fncave, "w"))){
      printf ("File: %s could not be opened \n", fncave);
      exit (1);
   }
   del_kx = 2.0 * PI / ((float) nx * del_x);
   del_ky = 2.0 * PI / ((float) ny * del_y);

   // get p1, p2, q11, q22 and q12 arrays filled up!
   for (i = 0; i < nx; i++){
      if (i <= nx_half) 
        kx = (float) i * del_kx;
      else 
        kx = (float) (i - nx) * del_kx;

      kxpow2 = kx * kx;

      for (j = 0; j < ny; j++){
         if (j <= ny_half)
           ky = (float) j * del_ky;
         else
           ky = (float) (j - ny) * del_ky;

         kypow2 = ky * ky;
         

	 // Note here that f.t. of ux = - i * kx * f.t.(u).
	 p1[i][j].re = kx * comp[i][j].im;
	 p1[i][j].im = -1.0 * kx * comp[i][j].re;

	 p2[i][j].re = ky * comp[i][j].im;
	 p2[i][j].im = -1.0 * ky * comp[i][j].re;

	 // the q-s in k-space actually are the negatives of the following.
	 // eventually, we will multiply them in pairs in r-space. so, 
	 // it should be okay!
	 q11[i][j].re = kxpow2 * comp[i][j].re;
	 q11[i][j].im = kxpow2 * comp[i][j].im;

	 q22[i][j].re = kypow2 * comp[i][j].re;
	 q22[i][j].im = kypow2 * comp[i][j].im;

	 q12[i][j].re = kx * ky * comp[i][j].re;
	 q12[i][j].im = kx * ky * comp[i][j].im;
	    
      }
   }

   // now that q11 ... are in k-space, get them to r-space;
   // do not forget to divide by one_by_nxny!
   fftwnd_one(p_dn, &p1[0][0], NULL);
   fftwnd_one(p_dn, &p2[0][0], NULL);
   fftwnd_one(p_dn, &q11[0][0], NULL);
   fftwnd_one(p_dn, &q22[0][0], NULL);
   fftwnd_one(p_dn, &q12[0][0], NULL);

   n_B_rich = 0;
   n_interface = 0;
   energy = 0.0;
   comp_dev = 0.0;
   for (i = 0; i < nx; i++) {
      for (j = 0; j < ny; j++){
	 // Since I do not really care about the imaginary part,
	 // they are not normalized.
	 tp1 = p1[i][j].re * one_by_nxny;
	 tp2 = p2[i][j].re * one_by_nxny;

	 tq11 = q11[i][j].re * one_by_nxny;
	 tq22 = q22[i][j].re * one_by_nxny;
	 tq12 = q12[i][j].re * one_by_nxny;
	 tc = dfdc[i][j].re;
	 energy += (a_factor * tc * tc * (1.0 - tc) * (1.0 - tc) +
		    kappa * (tp1 * tp1 + tp2 * tp2) +
	            gamma_s * (tq11 + tq22) * (tq11 + tq22) +
	            gamma_3 * (tq11 * tq11 + tq22 * tq22));
	 comp_dev += (tc * tc - alloycomp * alloycomp);
	 if (tc > 0.5) ++n_B_rich;
	 // redefine tc.
	 tc = tc - 0.5;
	 in = i + 1;
	 if (in >= nx) in -= nx;
	 je = j + 1;
	 if (je >= ny) je -= ny;
	 // redefine tp1; look east!
	 tp1 = dfdc[i][je].re - 0.5;
	 // redefine tp2; look north.
	 tp2 = dfdc[in][j].re - 0.5;
	 if ((tc * tp1) < 0.0) ++n_interface;
	 if ((tc * tp2) < 0.0) ++n_interface;
      }
   }
   energy *=  del_x * del_y * one_by_nxny;
   comp_dev *= one_by_nxny;

   area_B = del_x * del_y * n_B_rich;
   perimeter = del_x * n_interface;

   // get p1 and p2 arrays filled up with the structure function.
   for (i = 0; i < nx; i++){
      for (j = 0; j < ny; j++){
	 tp1 = comp[i][j].re;
	 tp2 = comp[i][j].im;
	 p1[i][j].re = (tp1 * tp1 + tp2 * tp2) * one_by_nxny;
	 p2[i][j].re = p1[i][j].re;
	 p1[i][j].im = 0.0;
	 p2[i][j].im = 0.0;
      }
   }
   // set value at the origin to zero.
   p1[0][0].re = 0;
   p2[0][0].re = 0;
   
   // Invert p2 to get the correlation function. 
   fftwnd_one(p_dn, &p2[0][0], NULL);

   // Now, p1 has structure function; p2 has correlation function.
   // Do the analysis on them!

   // First let us radially average the correlation and structure functions.
   // initialize the variables.
   k1 = 0.0;
   k_int = 0.0;
   for (i = 0; i < nx; i++){
      str_ave[i] = 0.0;
      cor_ave[i] = 0.0;
      str_n[i] = 0;
      cor_n[i] = 0;
   }

   for (i = 0; i < nx; i++){
      if (i <= nx_half)
         kx = (float) i;
      else 
         kx = (float) (i - nx);
      kxpow2 = kx * kx;

      for (j = 0; j < ny; j++){
         if (j <= ny_half) 
            ky = (float) j;
         else 
            ky = (float) (j - ny);
         kypow2 = ky * ky;
	 
	 // p1 contains the structure function.
	 tp1 = p1[i][j].re;
	 
	 // p2 contains the un-normalized correlation function.
         // Normalize p2 using both nxny *and* comp_dev.
	 p2[i][j].re *= one_by_nxny / comp_dev;
	 tp2 = p2[i][j].re;
	 
	 // compute which bin the value should go to.
	 // update the info for that bin.
	 tc = sqrt(kypow2 + kxpow2);
	 bin_indx = tc + tiny;
	 if ((tc - bin_indx) > 0.5) ++bin_indx;
	 if (bin_indx < nx_half){
	    ++str_n[bin_indx];
	    str_ave[bin_indx] += tp1;
	    ++cor_n[bin_indx];
	    cor_ave[bin_indx] += tp2;
	 }
	 k1 += (sqrt(kypow2 + kxpow2) * tp1);
	 k_int += tp1;
      }
   }

   k1 = k1 / k_int;
   k_int *= one_by_nxny;
   
   for (i = 0; i < nx_half; i++){
      str_ave[i] = str_ave[i] / str_n[i];
      cor_ave[i] = cor_ave[i] / cor_n[i];
   }

   // now tp1 contains the average aspect ratio.
   if (area_B > tiny) 
     tp1 = (n_cluster * area_B) / (perimeter * perimeter);
   else
     tp1 = 0.0;
   // Output time!
   sprintf (outstring, 
	    "%13.6e %13.6e %13.6e %13.6e %13.6e %13.6e %13.6e %4d\n",
	    sim_time, energy, comp_dev, k1, area_B, perimeter, tp1, n_cluster);
   fprintf (fpcave, 
	    "%1c %13.6e %13.6e %13.6e %13.6e %13.6e %13.6e %13.6e %4d \n",
	    hash_char, 
	    sim_time, energy, comp_dev, k1, area_B, perimeter, tp1, n_cluster);
   for (i = 0; i < nx_half; i++){
      fprintf (fpcave, 
	       "%4d %13.6e %13.6e %13.6e %13.6e %13.6e %13.6e\n", i,  
	       str_ave[i], p1[i][0].re, p1[i][i].re, 
	       cor_ave[i], p2[i][0].re, p2[i][i].re);
   }
   fprintf (fpcave, "\n");
   fclose (fpcave);
}

