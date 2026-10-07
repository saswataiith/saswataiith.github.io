// Copyright (c) 2026 Saswata Bhattacharyya.
// I permit free noncommercial teaching and demonstrations with acknowledgment.
// I require written permission for research or commercial use.
// I retain permissions granted by earlier licenses; dependencies keep their licenses.
// I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
(()=>{const video=document.getElementById('portrait-dynamics-video');if(!video)return;function select(reverse){video.pause();video.src='/assets/examples/portrait-dynamics/'+(reverse?'reverse':'forward')+'.mp4';video.poster='/assets/examples/portrait-dynamics/'+(reverse?'end':'start')+'.png';video.load();document.getElementById('portrait-mode').textContent=reverse?'REVERSE PLAYBACK of saved frames. This is a visual return to the starting photograph, not a reconstruction inferred by the equations.':'FORWARD SIMULATION. Both equations start from the same photograph. Neither uses the original as a target.';video.play().catch(()=>{});}document.getElementById('portrait-forward').onclick=()=>select(false);document.getElementById('portrait-reverse').onclick=()=>select(true);})();
