import React from 'react';

const NumericInput = ({
  value,
  onChange,
  maxDecimals = 4,
  placeholder = '0.00',
  readOnly = false,
  className = '',
  style = {},
  name,
  id,
  ...rest
}) => {
  const handleChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    const parts = val.split('.');
    if (parts.length === 2 && parts[1].length > maxDecimals) {
      val = parts[0] + '.' + parts[1].slice(0, maxDecimals);
    }
    if (onChange) {
      onChange({ target: { name, value: val } });
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={`numeric-input ${className}`}
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

export default NumericInput;
