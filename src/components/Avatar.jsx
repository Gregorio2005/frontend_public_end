import React from 'react';

const getInitials = (name, lastname) => {
  const n = (name || '').trim();
  const l = (lastname || '').trim();
  if (n && l) return (n[0] + l[0]).toUpperCase();
  if (n) return n.substring(0, 2).toUpperCase();
  return '?';
};

const getColorFromName = (name) => {
  const colors = [
    '#5c6bc0', '#26a69a', '#ef5350', '#ab47bc',
    '#42a5f5', '#66bb6a', '#ffa726', '#ec407a',
    '#7e57c2', '#26c6da', '#8d6e63', '#d4e157'
  ];
  let hash = 0;
  const str = (name || '').toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const Avatar = ({ name, lastname, url, approved, size = 40, style = {} }) => {
  const showPhoto = url && approved;
  const initials = getInitials(name, lastname);
  const bgColor = getColorFromName(name);

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    ...style,
  };

  if (showPhoto) {
    return (
      <div style={baseStyle}>
        <img
          src={url}
          alt={`${name || ''} ${lastname || ''}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        backgroundColor: bgColor,
        color: 'white',
        fontSize: size * 0.38,
        fontWeight: 700,
        letterSpacing: '0.02em',
      }}
    >
      {initials}
    </div>
  );
};

export default Avatar;
