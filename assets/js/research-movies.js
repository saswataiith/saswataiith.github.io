// I show the final frame until the visitor chooses to play the movie.
for (const player of document.querySelectorAll('.movie-player')) {
  const video = player.querySelector('video');
  const startButton = player.querySelector('.movie-start');

  startButton.addEventListener('click', async () => {
    // I start at the beginning and then use the browser's playback controls.
    video.currentTime = 0;
    startButton.hidden = true;
    try {
      await video.play();
    } catch {
      startButton.hidden = false;
      startButton.querySelector('span').textContent = 'Play movie — or use Open movie below';
    }
  });
}
