'use client';

import React from 'react';

export interface OSFileIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  isOpen?: boolean;
}

/**
 * Modern OS-style Directory Folder Icon (Golden Amber)
 * Matches the reference workstation file hierarchy.
 */
export const OSFolderIcon: React.FC<OSFileIconProps> = ({
  size = 18,
  className,
  isOpen = false,
  style,
  ...props
}) => {
  const uniqueId = React.useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id={`gold-back-${uniqueId}`} x1="3" y1="4" x2="21" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id={`gold-front-${uniqueId}`} x1="3" y1="8" x2="21" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id={`sheet-grad-${uniqueId}`} x1="6" y1="6" x2="18" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>

      {/* Back tab & body */}
      <path
        d="M3 6.5C3 5.39543 3.89543 4.5 5 4.5H9.41421C9.94469 4.5 10.4535 4.71071 10.8284 5.08579L12.4142 6.67157C12.7893 7.04665 13.2981 7.25736 13.8284 7.25736H19C20.1046 7.25736 21 8.15179 21 9.25736V16.5C21 17.6046 20.1046 18.5 19 18.5H5C3.89543 18.5 3 17.6046 3 16.5V6.5Z"
        fill={`url(#gold-back-${uniqueId})`}
      />

      {/* Sheet insert when open */}
      {isOpen && (
        <rect
          x="5"
          y="7"
          width="14"
          height="8"
          rx="1"
          fill={`url(#sheet-grad-${uniqueId})`}
          opacity="0.9"
        />
      )}

      {/* Front flap */}
      {isOpen ? (
        <path
          d="M2.5 11.5C2.5 10.5 3.3 9.8 4.3 9.8H19.7C20.7 9.8 21.5 10.5 21.5 11.5L20.8 17.2C20.6 18.2 19.8 19 18.8 19H5.2C4.2 19 3.4 18.2 3.2 17.2L2.5 11.5Z"
          fill={`url(#gold-front-${uniqueId})`}
          stroke="#d97706"
          strokeWidth="0.75"
        />
      ) : (
        <path
          d="M3 9.5C3 8.39543 3.89543 7.5 5 7.5H19C20.1046 7.5 21 8.39543 21 9.5V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V9.5Z"
          fill={`url(#gold-front-${uniqueId})`}
          stroke="#d97706"
          strokeWidth="0.5"
        />
      )}
    </svg>
  );
};

/**
 * Modern OS-style Open Directory Folder Icon
 */
export const OSFolderOpenIcon: React.FC<OSFileIconProps> = (props) => {
  return <OSFolderIcon isOpen={true} {...props} />;
};

/**
 * Active Selected Folder Icon (Vibrant Blue Highlighted)
 */
export const OSFolderActiveIcon: React.FC<OSFileIconProps> = ({
  size = 18,
  className,
  style,
  ...props
}) => {
  const uniqueId = React.useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id={`blue-back-${uniqueId}`} x1="3" y1="4" x2="21" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id={`blue-front-${uniqueId}`} x1="3" y1="8" x2="21" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>

      <path
        d="M3 6.5C3 5.39543 3.89543 4.5 5 4.5H9.41421C9.94469 4.5 10.4535 4.71071 10.8284 5.08579L12.4142 6.67157C12.7893 7.04665 13.2981 7.25736 13.8284 7.25736H19C20.1046 7.25736 21 8.15179 21 9.25736V16.5C21 17.6046 20.1046 18.5 19 18.5H5C3.89543 18.5 3 17.6046 3 16.5V6.5Z"
        fill={`url(#blue-back-${uniqueId})`}
      />

      <path
        d="M3 9.5C3 8.39543 3.89543 7.5 5 7.5H19C20.1046 7.5 21 8.39543 21 9.5V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V9.5Z"
        fill={`url(#blue-front-${uniqueId})`}
        stroke="#1d4ed8"
        strokeWidth="0.5"
      />
    </svg>
  );
};

/**
 * Modern OS-style Leaf Document File Icon
 * Clean sheet with folded dog-ear corner and data lines.
 */
export const OSFileIcon: React.FC<OSFileIconProps> = ({
  size = 18,
  className,
  style,
  ...props
}) => {
  const uniqueId = React.useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id={`file-body-${uniqueId}`} x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>

      {/* Main page outline with folded top-right corner */}
      <path
        d="M5 4.5C5 3.67157 5.67157 3 6.5 3H14.5L19 7.5V19.5C19 20.3284 18.3284 21 17.5 21H6.5C5.67157 21 5 20.3284 5 19.5V4.5Z"
        fill={`url(#file-body-${uniqueId})`}
        stroke="#94a3b8"
        strokeWidth="0.8"
      />

      {/* Folded corner tab */}
      <path
        d="M14.5 3V7H18.5"
        fill="#cbd5e1"
        stroke="#94a3b8"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />

      {/* Text lines */}
      <line x1="8" y1="11" x2="16" y2="11" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="14" x2="14" y2="14" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="8" y1="17" x2="12" y2="17" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
};
