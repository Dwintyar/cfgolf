import { useState, useEffect } from "react";
import GBLogo from "@/assets/logo-gb.svg";
import GBLogoDark from "@/assets/logo-gb-dark.svg";

interface GBLogoImgProps {
  className?: string;
  alt?: string;
}

const GBLogoImg = ({ className = "h-8 w-8 object-contain", alt = "GolfBuana" }: GBLogoImgProps) => {
  const [isLight, setIsLight] = useState(
    () => document.documentElement.classList.contains("light")
  );

  useEffect(() => {
    // Watch for class changes on <html> element (dark/light toggle)
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.classList.contains("light"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <img
      src={isLight ? GBLogo : GBLogoDark}
      alt={alt}
      className={className}
    />
  );
};

export default GBLogoImg;
