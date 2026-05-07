export function submitWebpayForm(url, token) {
  if (!url || !token) {
    throw new Error('Faltan datos para redirigir a Webpay.');
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = url;

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'token_ws';
  input.value = token;

  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
}
