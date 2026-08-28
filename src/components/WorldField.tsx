/**
 * 视口级氛围层：经纬网格、赤道环、沿轨道运行的卫星。
 * 纯装饰、不拦截指针；颜色全部走令牌，随主题切换。
 */
export default function WorldField() {
  return (
    <div className="world-field" aria-hidden>
      <div className="world-field__grid" />
      <div className="world-field__stars" />
      <div className="world-field__ring" />
      <div className="world-field__ring world-field__ring--inner" />
      <span className="world-field__sat" />
      <span className="world-field__core" />
    </div>
  );
}
