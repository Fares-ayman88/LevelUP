import React from 'react';
import './SkeletonNotification.css';

export default function SkeletonNotification() {
  return (
    <div className="skeleton-notification">
      <div className="skeleton skeleton-avatar"></div>
      <div className="skeleton-content">
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text short"></div>
      </div>
      <div className="skeleton-actions">
        <div className="skeleton skeleton-button"></div>
        <div className="skeleton skeleton-button"></div>
      </div>
    </div>
  );
}
