import { getEnvLabel } from '@/lib/envBranding';

interface TitleProps {
  children?: string;
}

export const Title = ({ children }: TitleProps) => {
  const envLabel = getEnvLabel();
  const prefix = envLabel ? `[${envLabel.label}]` : '';
  const suffix = children ? ` | たびしぇあ` : 'たびしぇあ';
  return <title>{`${prefix}${children ?? ''}${suffix}`}</title>;
};
