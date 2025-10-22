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

setInterval(() => {
  const bomb = document.createElement('img');
  bomb.src = 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmM0cGh2djJ4czdiZm9tdm52bWFibHZ6bnYwMXFkMjE4d3VjM3h2dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/aCsykbXB9oKfDnaVKP/giphy.gif'; 
  bomb.classList.add('bomb');
  bomb.style.left = Math.random() * window.innerWidth + 'px';
  bomb.style.top = '-100px';
  document.body.appendChild(bomb);

  setTimeout(() => bomb.remove(), 5000);
}, 600);