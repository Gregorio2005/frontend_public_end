import React from 'react';

const sanitizeRegex = {
  quotes: /[\s"'`]/g,
  quotesNoSpaces: /["'`]/g,
  alpha: /[^a-zA-ZñÑáéíóúÁÉÍÓÚ]/g,
  digits: /\D/g
};

const TextInput = ({
  value,
  onChange,
  sanitize = 'quotes',
  type = 'text',
  placeholder = '',
  readOnly = false,
  className = '',
  style = {},
  name,
  id,
  ...rest
}) => {
  const handleChange = (e) => {
    let val = e.target.value;
    const regex = sanitizeRegex[sanitize];
    if (regex) {
      val = val.replace(regex, '');
    }
    if (onChange) {
      onChange({ target: { name, value: val } });
    }
  };

  return (
    <input
      type={type}
      className={`text-input ${className}`}
      style={style}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      readOnly={readOnly}
      name={name}
      id={id}
      {...rest}
    />
  );
};

export default TextInput;
