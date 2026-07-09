/**
 * 轮播图骨架屏（加载态）。
 *
 * 全宽 div，高度与轮播图一致（响应式），
 * 使用 animate-pulse 实现闪烁动画。
 */
export default function BannerSkeleton() {
  return (
    <div className="w-full">
      <div className="h-[200px] w-full animate-pulse bg-slate-800 sm:h-[300px] lg:h-[400px]" />
    </div>
  );
}
