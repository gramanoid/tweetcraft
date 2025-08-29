console.log('Test popup script loaded!');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');
  
  const btn = document.getElementById('test-btn');
  const output = document.getElementById('output');
  
  if (btn) {
    console.log('Button found');
    btn.addEventListener('click', () => {
      console.log('Button clicked!');
      output.textContent = 'Button was clicked at ' + new Date().toLocaleTimeString();
    });
  } else {
    console.error('Button not found');
  }
});

// Also try without waiting for DOMContentLoaded
setTimeout(() => {
  console.log('Trying after timeout...');
  const btn = document.getElementById('test-btn');
  if (btn && !btn.hasAttribute('data-bound')) {
    btn.setAttribute('data-bound', 'true');
    btn.onclick = () => {
      console.log('Onclick handler triggered');
      document.getElementById('output').textContent = 'Clicked via onclick!';
    };
  }
}, 100);