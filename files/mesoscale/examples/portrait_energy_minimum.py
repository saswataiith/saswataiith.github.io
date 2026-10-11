# Copyright (c) 2026 Saswata Bhattacharyya.
# I permit free noncommercial teaching and demonstrations with acknowledgment.
# I require written permission for research or commercial use.
# I retain permissions granted by earlier licenses; dependencies keep their licenses.
# I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
"""A portrait prescribed as the energy minimum, with exact AC/CH evolution.
Run: python portrait_energy_minimum.py portrait.jpg output_directory [--color]
Requires numpy, pillow >= 10.1. The default retains the grayscale example.
For RGB I sum (u_j-r_j)^2/2 over the three independent color channels.
AC: u_t=-L*(u-r); CH: u_t=M*laplacian(u-r). All quantities are dimensionless.
The reference r IS encoded in the energy. This is not blind image recovery.
256² periodic grid on [0,32)^2. L=.03, M=1e-5. Exact propagators.
I shuffle whole pixels, preserving every channel's mean. Seed: 19.
"""
from pathlib import Path
import argparse
import numpy as np
from PIL import Image, ImageDraw, ImageFont


def portrait_font(size):
    # I try the original macOS font, then a portable font, then Pillow's font.
    fonts = [Path("/") / "System" / "Library" / "Fonts" / "Helvetica.ttc",
             "DejaVuSans.ttf"]
    for font in fonts:
        try:
            return ImageFont.truetype(str(font), size)
        except OSError:
            pass
    return ImageFont.load_default(size=size)


def prepare_portrait(path, color=False):
    # I keep RGB pixels together when I shuffle the color image.
    mode = 'RGB' if color else 'L'
    image = Image.open(path).convert(mode).resize((256, 256))
    target = np.asarray(image, dtype=float) / 127.5 - 1
    rng = np.random.default_rng(19)
    if color:
        initial = rng.permutation(target.reshape(-1, 3), axis=0).reshape(target.shape)
    else:
        initial = rng.permutation(target.ravel()).reshape(target.shape)
    return target, initial


def evolve(target, initial, time):
    # I transform the spatial axes only; RGB channels evolve independently.
    k = 2 * np.pi * np.fft.fftfreq(256, d=32 / 256)
    k2 = k[:, None]**2 + k[None, :]**2
    if target.ndim == 3:
        k2 = k2[:, :, None]
    error = initial - target
    transformed_error = np.fft.fft2(error, axes=(0, 1))
    ac = target + error * np.exp(-0.03 * time)
    ch = target + np.fft.ifft2(
        transformed_error * np.exp(-1e-5 * k2 * time), axes=(0, 1)).real
    return ac, ch


def run_example(portrait, output, color=False):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    target, initial = prepare_portrait(portrait, color)
    font, small = portrait_font(25), portrait_font(22)
    records = []
    times = np.r_[0, np.geomspace(0.1, 3e7, 240)]
    for index, time in enumerate(times):
        ac, ch = evolve(target, initial, time)
        energies = [0.5 * np.mean((field - target)**2) for field in [ac, ch]]
        if color:
            means = [*ac.mean(axis=(0, 1)), *ch.mean(axis=(0, 1))]
        else:
            means = [ac.mean(), ch.mean()]
        records.append([time, *means, *energies])
        frame = Image.new('RGB', (1160, 754), '#f5f7f2')
        draw = ImageDraw.Draw(frame)
        draw.text((24, 14), 'MY PORTRAIT IS THE ENERGY MINIMUM', font=font, fill='#173d40')
        draw.text((24, 51), f'Forward relaxation | time {time:.3g} | L=0.03, M=0.00001 | nonuniform time sampling', font=small, fill='#173d40')
        for x, field, title, energy in [
                (24, ac, 'Allen-Cahn | nonconserved', energies[0]),
                (604, ch, 'Cahn-Hilliard | conserved', energies[1])]:
            draw.text((x, 99), title, font=small, fill='#173d40')
            # I clip the displayed colors only, never the numerical fields.
            pixels = np.uint8(np.clip((field + 1) * 127.5, 0, 255))
            frame.paste(Image.fromarray(pixels).resize((528, 528)), (x, 139))
            if color:
                draw.text((x, 687), f'F / (3 x area): {energy:.3e}', font=small, fill='#173d40')
                rgb = field.mean(axis=(0, 1))
                draw.text((x, 718), 'Mean R/G/B: ' + ' / '.join(f'{v:+.3f}' for v in rgb), font=small, fill='#173d40')
            else:
                draw.text((x, 687), f'Energy / area: {energy:.7f}', font=small, fill='#173d40')
                draw.text((x, 718), f'Mean field: {field.mean():+.5f}', font=small, fill='#173d40')
        frame.save(output / f'frame-{index:03d}.png')
    initial_mean = initial.mean(axis=(0, 1))
    assert np.max(np.abs(ch.mean(axis=(0, 1)) - initial_mean)) < 1e-10
    assert max(energies) < 1e-6
    if color:
        header = 'time,AC_R_mean,AC_G_mean,AC_B_mean,CH_R_mean,CH_G_mean,CH_B_mean,AC_energy_per_area_per_channel,CH_energy_per_area_per_channel'
    else:
        header = 'time,AC_mean,CH_mean,AC_energy_per_area,CH_energy_per_area'
    np.savetxt(output / 'diagnostics.csv', records, delimiter=',', header=header, comments='')
    print('Final energy densities:', energies)
    print('CH maximum channel mean drift:', np.max(np.abs(ch.mean(axis=(0, 1)) - initial_mean)))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('portrait')
    parser.add_argument('output_directory')
    parser.add_argument('--color', action='store_true', help='Evolve the three RGB channels independently.')
    args = parser.parse_args()
    run_example(args.portrait, args.output_directory, args.color)
