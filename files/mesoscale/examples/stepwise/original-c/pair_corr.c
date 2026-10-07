#include<stdio.h>
#include<stdlib.h>
#include<math.h>
#include<complex.h>

#include <fftw3.h>

#define tiny 1.0e-5

void pair_correlation(char *NAME, char *name1, char *name2, 
int n_x, int n_y, double ave_comp){

FILE *fp;
FILE *fpr;
double *c;
size_t tmp;
int i1,i2,J,bin_index;
int INDICATOR=0;
double x1,y1,x2,y2,x;
int nxny;
double inv_nxny;

double comp_deviation;

fftw_complex  *comp, *comp_tilde;
fftw_complex *struc_func, *pair_corr_func;

double sfreal, pcfreal;

int half_nx, half_ny;
double kx, ky;
double kx2, ky2;
double k;
double str_ave[n_x], cor_ave[n_x];
int str_n[n_x], cor_n[n_x];

fftw_plan planF, planB;

/* Declare the FFTW plans */

planF =
fftw_plan_dft_2d(n_x,n_y,comp,comp_tilde,FFTW_FORWARD,FFTW_ESTIMATE);
planB =
fftw_plan_dft_2d(n_x,n_y,struc_func,pair_corr_func,FFTW_BACKWARD,
FFTW_ESTIMATE);

/* Open the data file and read the binary data */

nxny = n_x*n_y;
inv_nxny = 1.0/nxny;

if( (fpr = fopen("data/char_length_scale","a")) == NULL){
printf("Unable to open the data file to write.\n");
printf("Exiting from pair_corr.c\n");
exit(0);
}
else{
fpr = fopen("data/char_length_scale","a");
}

c = (double*) malloc((size_t)nxny*sizeof(double));

if( (fp = fopen(NAME,"r")) == NULL){
printf("Unable to open the data file %s to read.\n",NAME);
printf("Exiting from pair_corr.c\n");
exit(0);
}
else{
fp = fopen(NAME,"r");
}
tmp = fread(&c[0],sizeof(double),(size_t) n_x*n_y,fp);
fclose(fp);

comp = fftw_malloc(nxny*sizeof(fftw_complex));
comp_tilde = fftw_malloc(nxny*sizeof(fftw_complex));
struc_func = fftw_malloc(nxny*sizeof(fftw_complex));
pair_corr_func = fftw_malloc(nxny*sizeof(fftw_complex));

/* Get the composition in real and Fourier spaces */

comp_deviation = 0.0;
for(i1=0; i1 < n_x; ++i1){
for(i2=0; i2 < n_y; ++i2){
J = i2+n_y*i1;
creal(comp[J]) = c[J];
cimag(comp[J]) = 0.0;
comp_deviation = comp_deviation + c[J]*c[J] - ave_comp*ave_comp;
}}
comp_deviation = comp_deviation*inv_nxny;
fftw_execute_dft(planF,comp,comp_tilde);

/* To get the structure functions */

for(i1=0; i1 < n_x; ++i1){
for(i2=0; i2 < n_y; ++i2){
J = i2+n_y*i1;
struc_func[J] = inv_nxny*comp_tilde[J]*conj(comp_tilde[J]);
}}
struc_func[0] = 0.0;

/* To get the pair correlation function */

fftw_execute_dft(planB,struc_func,pair_corr_func);

for(i1=0; i1 < n_x; ++i1){
for(i2=0; i2 < n_y; ++i2){
J = i2+n_y*i1;
pair_corr_func[J] = inv_nxny*pair_corr_func[J]/comp_deviation;
}}

/* Initialise for averaging */

for(i1=0; i1 < n_x; ++i1){
str_ave[i1] = 0.0;
cor_ave[i1] = 0.0;
str_n[i1] = 0;
cor_n[i1] = 0;
}

/* To do the circular averaging */

half_nx = (int) n_x/2;
half_ny = (int) n_y/2;

for(i1=0; i1 < n_x; ++i1){
if(i1 <= half_nx) kx = (double) i1;
else kx = (double) (i1-n_x);
kx2 = kx*kx;
for(i2=0; i2 < n_y; ++i2){
if(i2 <= half_ny) ky = (double) i2;
else ky = (double) (i2-n_y);
ky2 = ky*ky;

J = i2+n_y*i1;
k = sqrt(kx2+ky2);
bin_index = (k + tiny);
sfreal = creal(struc_func[J]);
pcfreal = creal(pair_corr_func[J]);
if((k-bin_index) > 0.5) bin_index = bin_index + 1;
if(bin_index < half_nx){
	str_n[bin_index] = str_n[bin_index] + 1;
	str_ave[bin_index] = str_ave[bin_index] + sfreal;
	cor_n[bin_index] = cor_n[bin_index] + 1;
	cor_ave[bin_index] = cor_ave[bin_index] + pcfreal;
}
}}


for(i1=0; i1<half_nx; ++i1){
str_ave[i1] = str_ave[i1]/str_n[i1];
cor_ave[i1] = cor_ave[i1]/cor_n[i1];
}

if( (fp = fopen(name1,"w")) == NULL){
printf("Unable to open the data file to write.\n");
exit(0);
}
else{
fp = fopen(name1,"w");
}
fprintf(fp,"# %le is the average alloy composition\n",ave_comp);
for(i1 = 0; i1 < half_nx; ++i1){
fprintf(fp,"%d %le\n",i1,str_ave[i1]);
}
fclose(fp);
 
if( (fp = fopen(name2,"w")) == NULL){
printf("Unable to open the data file to write.\n");
exit(0);
}
else{
fp = fopen(name2,"w");
}
if(fabs(1.0 - cor_ave[0]) > 1.0e-6){ 
fprintf(fp,"# The correlation function does not start at unity\n");
fprintf(fp,"# Instead it starts at %le\n",cor_ave[0]);
printf("The correlation function does not start at unity\n");
printf("Instead it starts at %le\n",cor_ave[0]);
}
fprintf(fp,"# %le is the average alloy composition\n",ave_comp);
for(i1 = 0; i1 < half_nx; ++i1){
fprintf(fp,"%d %le\n",i1,cor_ave[i1]);
	if(INDICATOR == 0 && cor_ave[i1] < 0.0 && cor_ave[i1-1] > 0.0){
		x1 = (double) (i1-1);
		x2 = (double) i1;
		y1 = cor_ave[i1-1];
		y2 = cor_ave[i1];
		INDICATOR = INDICATOR + 1;
	}
}
x = x1 - y1*(x2-x1)/(y2-y1);
fprintf(fp,"# The crossing of first zero: %le\n",x);
fprintf(fpr,"%le\n",x);
fclose(fp);
fclose(fpr);

free(c);
fftw_free(comp);
fftw_free(comp_tilde);
fftw_free(struc_func);
fftw_free(pair_corr_func);
}
