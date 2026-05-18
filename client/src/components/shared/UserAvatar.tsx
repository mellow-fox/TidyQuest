import React, { useState } from 'react';
import { AvatarPresetIcon } from '../icons/avatars';

interface UserAvatarProps {
  name: string;
  color: string;
  size?: number;
  avatarType?: 'letter' | 'preset' | 'photo';
  avatarPreset?: string | null;
  avatarPhotoUrl?: string | null;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  color,
  size = 38,
  avatarType = 'letter',
  avatarPreset,
  avatarPhotoUrl,
}) => {
  const [photoError, setPhotoError] = useState(false);

  // Photo mode
  if (avatarType === 'photo' && avatarPhotoUrl && !photoError) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '35%',
          overflow: 'hidden',
          border: `2px solid ${color}66`,
          flexShrink: 0,
        }}
      >
        <img
          src={avatarPhotoUrl}
          alt={name}
          onError={() => setPhotoError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }

  // Preset mode
  if (avatarType === 'preset' && avatarPreset) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '35%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <AvatarPresetIcon presetId={avatarPreset} size={size} />
      </div>
    );
  }

  // Letter mode (default/fallback)
  const letter = name.charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '35%',
        background: `linear-gradient(135deg, ${color}44, ${color}22)`,
        border: `2px solid ${color}66`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 800,
        color,
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
};

export { UserAvatar };
export default UserAvatar;
