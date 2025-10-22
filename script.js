// 🌟 Star trail effect
document.addEventListener('mousemove', function(e) {
  const star = document.createElement('div');
  star.classList.add('star');
  star.innerText = '★';
  star.style.left = e.pageX + 'px';
  star.style.top = e.pageY + 'px';
  document.body.appendChild(star);
  setTimeout(() => star.remove(), 1000);
});

// ✨ Sparkle overlay
setInterval(() => {
  const sparkle = document.createElement('div');
  sparkle.classList.add('sparkle');
  sparkle.innerText = '✦';
  sparkle.style.left = Math.random() * window.innerWidth + 'px';
  sparkle.style.top = Math.random() * window.innerHeight + 'px';
  document.body.appendChild(sparkle);
  setTimeout(() => sparkle.remove(), 2000);
}, 200);

// 🎰 Fake visitor counter increment
let count = 42;
setInterval(() => {
  count++;
  document.getElementById('visits').innerText = count.toString().padStart(6, '0');
}, 1000);
