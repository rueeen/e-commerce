import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';

export const notyf = new Notyf({
  duration: 3500,
  position: {
    x: 'right',
    y: 'top',
  },
  dismissible: true,
  ripple: true,
  types: [
    {
      type: 'success',
      duration: 3000,
      dismissible: true,
    },
    {
      type: 'error',
      duration: 4500,
      dismissible: true,
    },
    {
      type: 'warning',
      duration: 4000,
      dismissible: true,
      background: '#f59e0b',
      icon: false,
    },
    {
      type: 'info',
      duration: 3500,
      dismissible: true,
      background: '#2563eb',
      icon: false,
    },
  ],
});

export const notifySuccess = (message = 'Operación realizada correctamente.') => {
  notyf.success(message);
};

export const notifyError = (message = 'Ocurrió un error inesperado.') => {
  notyf.error(message);
};

export const notifyWarning = (message = 'Revisa la información ingresada.') => {
  notyf.open({
    type: 'warning',
    message,
  });
};

export const notifyInfo = (message) => {
  notyf.open({
    type: 'info',
    message,
  });
};