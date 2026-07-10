import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { apiClient } from "../services/api";
import type { Banner } from "../types";
import BannerSkeleton from "./BannerSkeleton";

/**
 * 首页轮播图组件。
 *
 * 使用 Swiper.js 实现：
 * - 自动播放（4 秒间隔，交互后不停止）
 * - 鼠标悬停暂停
 * - 导航箭头 + 圆点分页器
 * - 移动端支持手势滑动
 * - 响应式高度（桌面 400px / 平板 300px / 手机 200px）
 * - 加载中显示骨架屏
 * - 空数据时 return null（不占 DOM）
 */
export default function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  let mounted = true;

  useEffect(() => {
    mounted = true;
    apiClient
      .getBanners()
      .then((data) => {
        if (mounted) setBanners(data);
      })
      .catch(() => {
        if (mounted) setBanners([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  /** 加载中显示骨架屏。 */
  if (loading) return <BannerSkeleton />;

  /** 无数据时不渲染。 */
  if (banners.length === 0) return null;

  return (
    <div className="banner-carousel relative w-full">
      {/* 自定义 Swiper 样式 */}
      <style>{`
        .banner-carousel .swiper-button-prev,
        .banner-carousel .swiper-button-next {
          color: #fff;
          background: rgba(0, 0, 0, 0.3);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .banner-carousel .swiper-button-prev:hover,
        .banner-carousel .swiper-button-next:hover {
          background: rgba(0, 0, 0, 0.5);
        }
        .banner-carousel .swiper-button-prev::after,
        .banner-carousel .swiper-button-next::after {
          font-size: 16px;
          font-weight: bold;
        }
        .banner-carousel .swiper-pagination-bullet {
          background: rgba(255, 255, 255, 0.5);
          opacity: 1;
          width: 8px;
          height: 8px;
          transition: all 0.2s;
        }
        .banner-carousel .swiper-pagination-bullet-active {
          background: #3b9eff;
          width: 20px;
          border-radius: 4px;
        }
        .banner-carousel .swiper-pagination {
          bottom: 12px;
        }
      `}</style>

      <Swiper
        modules={[Autoplay, Navigation, Pagination]}
        autoplay={{
          delay: 4000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        loop={banners.length > 1}
        navigation={true}
        pagination={{ clickable: true }}
        className="w-full"
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner.id}>
            {banner.linkUrl ? (
              <a
                href={banner.linkUrl}
                className="block w-full"
                target={banner.linkUrl.startsWith("http") ? "_blank" : undefined}
                rel={banner.linkUrl.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                <BannerImage banner={banner} />
              </a>
            ) : (
              <BannerImage banner={banner} />
            )}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

/**
 * 单张轮播图图片，响应式高度。
 */
function BannerImage({ banner }: { banner: Banner }) {
  return (
    <div className="relative w-full overflow-hidden">
      <img
        src={banner.imageUrl}
        alt={banner.title}
        className="h-[200px] w-full object-cover sm:h-[300px] lg:h-[400px]"
        loading="eager"
      />
      {/* 标题遮罩层 */}
      {banner.title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
          <p className="text-sm font-medium text-white sm:text-base">
            {banner.title}
          </p>
        </div>
      )}
    </div>
  );
}
