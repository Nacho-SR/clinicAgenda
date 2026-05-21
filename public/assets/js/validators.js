export function isRequired(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

export function hasMinLength(value, minLength) {
  return String(value ?? '').trim().length >= minLength;
}

export function isPositiveNumber(value) {
  const numberValue = Number(value);
  return !Number.isNaN(numberValue) && numberValue > 0;
}

export function isValidDate(value) {
  if (!isRequired(value)) return false;

  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

export function isValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value).trim());
}

export function validateFields(fields) {
  const errors = [];

  fields.forEach((field) => {
    const { label, value, rules } = field;

    if (rules.required && !isRequired(value)) {
      errors.push(`${label} es obligatorio.`);
    }

    if (rules.email && isRequired(value) && !isValidEmail(value)) {
      errors.push(`${label} debe ser un correo válido.`);
    }

    if (rules.minLength && isRequired(value) && !hasMinLength(value, rules.minLength)) {
      errors.push(`${label} debe tener al menos ${rules.minLength} caracteres.`);
    }

    if (rules.positive && isRequired(value) && !isPositiveNumber(value)) {
      errors.push(`${label} debe ser un número positivo.`);
    }

    if (rules.date && isRequired(value) && !isValidDate(value)) {
      errors.push(`${label} debe ser una fecha válida.`);
    }

    if (rules.time && isRequired(value) && !isValidTime(value)) {
      errors.push(`${label} debe tener formato HH:mm.`);
    }
  });

  return errors;
}