import { getEnvLabel } from '@/lib/envBranding';

interface TitleProps {
  children?: string;
}

const DEFAULT_TITLE = 'たびしぇあ | 旅程を簡単に作成・共有';

export const Title = ({ children }: TitleProps) => {
  const envLabel = getEnvLabel();
  const prefix = envLabel ? `[${envLabel.label}]` : '';
  const title = children ? `${children} | たびしぇあ` : DEFAULT_TITLE;
  return <title>{`${prefix}${title}`}</title>;
};
