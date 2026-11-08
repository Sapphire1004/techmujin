const DEFAULT_COMMUNITY_ICON = "/images/techmujin/icon-512.png";

export function CommunityImage({ src, size = 40, className }: {
  src: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <img
      className={className}
      src={src ?? DEFAULT_COMMUNITY_ICON}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={({ currentTarget }) => {
        // 代替画像も読み込めない場合に、再読み込みを繰り返さないようにします。
        if (currentTarget.getAttribute("src") !== DEFAULT_COMMUNITY_ICON) {
          currentTarget.src = DEFAULT_COMMUNITY_ICON;
        }
      }}
    />
  );
}
