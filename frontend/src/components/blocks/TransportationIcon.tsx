import bicycleIcon from '@/assets/icons/bicycle.svg';
import busIcon from '@/assets/icons/bus.svg';
import carIcon from '@/assets/icons/car.svg';
import personWalkingIcon from '@/assets/icons/person-walking.svg';
import planeIcon from '@/assets/icons/plane.svg';
import shipIcon from '@/assets/icons/ship.svg';
import trainIcon from '@/assets/icons/train.svg';
import { cn } from '@/lib/utils';
import type { TransportationType } from '@/types/block';

interface TransportationIconProps {
  type: TransportationType;
  className?: string;
}

const iconMap: Record<TransportationType, string> = {
  car: carIcon,
  bus: busIcon,
  train: trainIcon,
  flight: planeIcon,
  ship: shipIcon,
  bicycle: bicycleIcon,
  walk: personWalkingIcon,
};

const getIconLabel = (type: TransportationType): string => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

export function TransportationIcon({ type, className }: TransportationIconProps) {
  const iconSrc = iconMap[type];
  const iconLabel = getIconLabel(type);

  if (!iconSrc) {
    return <div className={cn('flex h-8 w-8 items-center justify-center text-neutral-400', className)}>?</div>;
  }

  return <img src={iconSrc} alt={iconLabel} className={cn('h-8 w-8', className)} />;
}
