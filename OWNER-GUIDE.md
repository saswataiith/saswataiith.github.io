# Editing Saswata's website

This is the short owner’s guide for `https://saswataiith.github.io/`. The site is a Jekyll website hosted by GitHub Pages. You can edit it in VS Code, preview it on your Mac, and publish by pushing to the `master` branch.

## 1. Open the website in VS Code

If the repository is not on your computer yet:

```bash
git clone https://github.com/saswataiith/saswataiith.github.io.git
cd saswataiith.github.io
code .
```

If it is already on your computer, open its folder in VS Code. Before editing, open **Terminal → New Terminal** and update your copy:

```bash
git checkout master
git pull --ff-only
```

## 2. Know which file to edit

| What you want to change | File |
|---|---|
| Home and About content | `_pages/about.md` |
| Research areas | `_pages/research.html` |
| Publications | `_data/selected_publications.yml` |
| Teaching | `_pages/teaching.html` |
| Resources | `_pages/resources.html` and `_data/mesoscale_resources.yml` |
| The Fun in Science | `_pages/notebook.html` and `_data/personal_notebook.yml` |
| CV | `_pages/cv.md` |
| Main menu | `_data/navigation.yml` |
| Header, footer and contact block | `_layouts/scholar.html` |
| Fonts, colors and layout | `assets/css/scholar.css` |
| Images | `assets/images/` |
| Downloadable notebooks and code | `files/` |

Do not edit `_site/`. Jekyll generates that folder and will overwrite it.

Use **Bhattacharyya** throughout the site. The postal contact block intentionally uses **Bhattacharya**.

## 3. Preview before publishing

Install the local tools once:

```bash
brew install ruby
export PATH="/opt/homebrew/opt/ruby/bin:$PATH"
gem install bundler
bundle install
```

On an Intel Mac, Homebrew may install Ruby under `/usr/local/opt/ruby/bin` instead. Run `brew --prefix ruby` to see the correct location. Add the appropriate `export PATH=...` line to `~/.zshrc` if you want it available in every new terminal.

Start the preview server from the repository folder:

```bash
bundle exec jekyll serve --livereload
```

Open `http://127.0.0.1:4000/`. Save a file in VS Code and refresh the relevant page. Stop the server with **Control-C**.

Before publishing, run a complete build:

```bash
bundle exec jekyll build
```

## 4. Make common additions

### Add a publication

Open `_data/selected_publications.yml`, copy one complete record, paste it in the appropriate position, and change its values. Despite the `.yml` extension, this file currently uses JSON syntax:

```json
{
  "year": 2026,
  "journal": "Journal Name · volume · article number",
  "title": "Complete paper title",
  "authors": "Author One, Author Two and Saswata Bhattacharyya",
  "url": "https://doi.org/...",
  "topic": "Elastic stress effects"
}
```

Keep the indentation and punctuation consistent. Place a comma between adjacent records, but not after the last record. Prefer a DOI link.

### Add a Fun in Science note

Open `_data/personal_notebook.yml` and copy an existing record inside the `notes` array. This file also uses JSON syntax. Each note needs a date, title and body. The body supports Markdown and MathJax.

```json
{
  "date": "2026-09-22",
  "title": "A question worth discussing",
  "body": "Write the first paragraph here.\n\nWrite the next paragraph here. Inline mathematics can use \\\\(f(c)\\\\)."
}
```

Use `\n\n` inside the quoted body to begin a new paragraph. Retain commas between note records.

### Add an image

1. Put the image in a suitable folder under `assets/images/`.
2. Use a short lowercase filename such as `gamma-prime-rafting.jpg`.
3. Remove private metadata and resize very large photographs before publishing.
4. Add meaningful alternative text.

```html
<img src="/assets/images/research/gamma-prime-rafting.jpg"
     alt="Gamma-prime precipitates after directional coarsening"
     loading="lazy">
```

Only publish images that you own or have permission to share. Credit student work and external sources beside the image.

### Add mathematics

MathJax is already installed. Write inline mathematics as:

```text
\(\mu=\delta F/\delta c\)
```

Write displayed mathematics as:

```text
\[
F=\int_V\left[f(c)+\frac{\kappa}{2}|\nabla c|^2\right]dV.
\]
```

Use LaTeX commands inside MathJax instead of Unicode approximations. After building, check that commands such as `\theta`, `\varepsilon` and `\frac` render correctly.

### Add a Jupyter notebook

1. Clear large or private outputs unless they are needed for teaching.
2. Put the notebook under `files/` in the relevant topic folder.
3. Run every cell from top to bottom in a clean kernel.
4. Link both the file and a Colab version when useful.

```html
<a href="/files/topic/example.ipynb" download>Download notebook ↓</a>
<a href="https://colab.research.google.com/github/saswataiith/saswataiith.github.io/blob/master/files/topic/example.ipynb">Open in Colab ↗</a>
```

## 5. Review and publish

See exactly what changed:

```bash
git status
git diff --check
git diff
```

Publish only the intended files:

```bash
git add path/to/file1 path/to/file2
git commit -m "Describe the website update"
git push origin master
```

Open the repository’s **Actions** tab and wait for `pages-build-deployment` to finish successfully. Then inspect the public page in a private browser window. GitHub Pages may take a minute or two to update.

## 6. Undo a mistake safely

Before committing, discard changes to one file:

```bash
git restore path/to/file
```

After publishing, find the commit and create a reversing commit:

```bash
git log --oneline -10
git revert COMMIT_ID
git push origin master
```

Do not use force-push for routine corrections.

## 7. Ask for help effectively

When asking Codex or a collaborator, provide:

1. The public page URL.
2. The exact heading or paragraph to change.
3. The replacement text or intended scientific point.
4. Source files, papers or figures that should be consulted.
5. Anything that must remain unchanged.
6. Whether the result should be previewed only or published.

Example request:

> On `https://saswataiith.github.io/research/#elastic-stress`, add a short publication-grounded paragraph about rafting in Ni-base superalloys. Use my latest CV and the attached paper. Keep the existing derivation links and MathJax notation. Build the site, check links, and publish after the checks pass.

For an error, also include the command you ran and the complete error message. A screenshot helps with layout problems, but source text and the page URL are more useful for scientific-content corrections.

## 8. Final check before every publication

- Scientific statements and equations are correct.
- Names, affiliations, paper titles and links are verified.
- No birth date, personal phone number, private email, home address, funding amount or student-private material is included.
- Images have permission, credit and useful alternative text.
- New code or notebooks run from a clean start.
- `bundle exec jekyll build` succeeds.
- `git diff` contains only the intended changes.
- The deployed page works on both desktop and mobile.

The CμMS group website is a separate repository: `https://github.com/CMSLAB-IITH/cmslab-iith.github.io`. Its member-editing instructions are in that repository’s `CONTRIBUTING.md`.
