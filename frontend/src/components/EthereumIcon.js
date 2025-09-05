import React from 'react';

const EthereumIcon = ({ size = 16, color = 'currentColor' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ color }}
    >
      <path 
        d="M11.944 17.97L4.58 13.62L11.943 24L19.31 13.62L11.944 17.97ZM12.056 0L4.69 12.22L12.056 16.5L19.42 12.22L12.056 0Z" 
        fill="currentColor"
      />
    </svg>
  );
};

export default EthereumIcon;
