import { memo } from 'react';

/** Every pixel-art PNG in src/assets/icons, by file name (without extension). */
export type IconName =
  | 'about'
  | 'achievements'
  | 'adv-dragon'
  | 'adv-haul'
  | 'adv-hot'
  | 'adv-inventory'
  | 'adv-world'
  | 'arrow'
  | 'avatar'
  | 'contact'
  | 'contact-email'
  | 'contact-instagram'
  | 'contact-linkedin'
  | 'contact-location'
  | 'craft-books'
  | 'craft-keyboard'
  | 'craft-lamp'
  | 'craft-laptop'
  | 'craft-robot'
  | 'craft-rocket'
  | 'craft-ruler'
  | 'craft-wrench'
  | 'done'
  | 'emerald'
  | 'experience'
  | 'heart'
  | 'hero'
  | 'hunger'
  | 'item-bolt'
  | 'item-cone'
  | 'item-satellite'
  | 'item-spyglass'
  | 'item-star'
  | 'locked'
  | 'outro'
  | 'palette'
  | 'projects'
  | 'services'
  | 'skills'
  | 'trade-brand'
  | 'trade-cinema'
  | 'trade-landing'
  | 'trade-website';

const files = import.meta.glob<string>('../assets/icons/*.png', { eager: true, query: '?url', import: 'default' });

const iconUrls = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.png'.length), url]),
) as Record<IconName, string>;

type ItemIconProps = {
  name: IconName;
  size?: number; // rendered px (square), default 32
  title?: string; // accessible name; omitted → decorative
  className?: string;
};

/** A pixel-art PNG icon, rendered crisp at any size. Shares the `.pixel-icon` class with PixelIcon. */
export const ItemIcon = memo(function ItemIcon({ name, size = 32, title, className = '' }: ItemIconProps) {
  return (
    <img
      className={`pixel-icon item-icon ${className}`}
      src={iconUrls[name]}
      width={size}
      height={size}
      alt={title ?? ''}
      draggable={false}
      style={{ imageRendering: 'pixelated' }}
    />
  );
});
