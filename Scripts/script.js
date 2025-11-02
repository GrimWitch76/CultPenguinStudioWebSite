document.addEventListener('mousemove', function(e) {
  const star = document.createElement('div');
  star.classList.add('star');
  star.innerText = '★';
  star.style.left = e.pageX + 'px';
  star.style.top = e.pageY + 'px';
  document.body.appendChild(star);
  setTimeout(() => star.remove(), 1000);
});

setInterval(() => {
  const sparkle = document.createElement('div');
  sparkle.classList.add('sparkle');
  sparkle.innerText = '✦';
  sparkle.style.left = Math.random() * window.innerWidth + 'px';
  sparkle.style.top = Math.random() * window.innerHeight + 'px';
  document.body.appendChild(sparkle);
  setTimeout(() => sparkle.remove(), 2000);
}, 200);

let count = 42;
setInterval(() => {
  count++;
  document.getElementById('visits').innerText = count.toString().padStart(6, '0');
}, 1000);

const dinoGifs = [
  "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExaDR0NnQxeTV1eWV4NHd1c2pzeWNidHliMWIxM3Z1aHN2NW56aXo2ZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/VymXgA7O3RMWI/giphy.gif"   // raptor
];

setInterval(() => {
  const dino = document.createElement('img');
  dino.src = dinoGifs[Math.floor(Math.random() * dinoGifs.length)];
  dino.classList.add('dino');
  dino.style.left = Math.random() * window.innerWidth + 'px';
  dino.style.top = '-120px';
  document.body.appendChild(dino);
  setTimeout(() => dino.remove(), 7000);
}, 1600);

setInterval(() => {
  const godzilla = document.getElementById('godzilla');
  const laser = document.getElementById('laser');

  // Beam animation
  laser.style.transition = 'none';
  laser.style.width = '0';
  laser.style.opacity = '1';
  laser.style.left = parseInt(getComputedStyle(godzilla).left) + 300 + 'px';

  setTimeout(() => {
    laser.style.transition = 'width 0.3s ease-out';
    laser.style.width = '800px';
  }, 100);

  // Fade beam out
  setTimeout(() => {
    laser.style.opacity = '0';
  }, 800);

}, 10000); // fires every 10 seconds

