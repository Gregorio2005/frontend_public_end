import React from 'react';
import Select, { components } from 'react-select';

const SingleValueWithTooltip = (props) => (
  <components.SingleValue {...props}>
    <span title={props.children}>{props.children}</span>
  </components.SingleValue>
);

const CustomSelect = ({
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Seleccione...',
  required = false,
  disabled = false,
  className = '',
  style = {},
  menuMinWidth = null,
  menuPlacement = 'auto',
  ...rest
}) => {
  const selectedOption = options.find(opt => String(opt.value) === String(value)) || null;

  const handleChange = (selected) => {
    if (onChange) {
      onChange({ target: { name, value: selected ? selected.value : '' } });
    }
  };

  return (
    <Select
      name={name}
      className={`custom-select ${className}`}
      classNamePrefix="custom-select"
      value={selectedOption}
      onChange={handleChange}
      options={options}
      placeholder={placeholder}
      isDisabled={disabled}
      isSearchable={false}
      required={required}
      menuPlacement={menuPlacement}
      styles={{
        control: (base, state) => ({
          ...base,
          minHeight: '42px',
          border: `1px solid ${state.isFocused ? '#a8000c' : '#e1e3e4'}`,
          borderRadius: '0.5rem',
          backgroundColor: disabled ? '#e7e8e9' : '#ffffff',
          boxShadow: state.isFocused ? '0 0 0 3px rgba(168, 0, 12, 0.1)' : 'none',
          '&:hover': { borderColor: disabled ? '#e1e3e4' : '#5d5e61' },
          fontSize: '0.9rem',
          color: '#191c1d',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          ...style,
        }),
        valueContainer: (base) => ({
          ...base,
          padding: '0 0.8rem',
          overflow: 'hidden',
        }),
        singleValue: (base) => ({
          ...base,
          color: '#191c1d',
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }),
        placeholder: (base) => ({
          ...base,
          color: '#5d5e61',
          fontSize: '0.9rem',
        }),
        menu: (base) => ({
          ...base,
          ...(menuMinWidth ? { minWidth: menuMinWidth } : {}),
          borderRadius: '0.5rem',
          border: '1px solid #e1e3e4',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 9999,
          overflow: 'hidden',
        }),
        option: (base, state) => ({
          ...base,
          backgroundColor: state.isSelected ? '#a8000c' : state.isFocused ? '#f3f4f5' : '#ffffff',
          color: state.isSelected ? '#ffffff' : '#191c1d',
          padding: '0.6rem 0.8rem',
          fontSize: '0.9rem',
          cursor: 'pointer',
          '&:active': {
            backgroundColor: state.isSelected ? '#a8000c' : '#e7e8e9',
          },
        }),
        indicatorSeparator: () => ({
          display: 'none',
        }),
        dropdownIndicator: (base, state) => ({
          ...base,
          color: '#5d5e61',
          padding: '0 8px',
          transition: 'transform 0.2s',
          transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0)',
        }),
        noOptionsMessage: (base) => ({
          ...base,
          color: '#5d5e61',
          fontSize: '0.9rem',
        }),
      }}
      noOptionsMessage={() => 'Sin opciones'}
      components={{ SingleValue: SingleValueWithTooltip }}
      {...rest}
    />
  );
};

export default CustomSelect;
