'use client';

interface FooterProps {
  contactImage: string | null;
}

export function Footer({ contactImage }: FooterProps) {
  return (
    <footer className="py-12 border-t border-border/50">
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-secondary text-[11px] uppercase tracking-wider font-medium">
        <p>&copy; {new Date().getFullYear()} Al Creative Commons.</p>
        <div className="flex gap-6 mt-4 md:mt-0 items-center">
          {/* Contact with hover image */}
          <div className="relative group">
            <span className="hover:text-primary transition-colors cursor-pointer">
              联系我
            </span>
            {contactImage && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 hidden md:block">
                <div className="w-48 h-48 bg-white rounded-lg shadow-xl border border-border p-2">
                  <img
                    src={contactImage}
                    alt="联系我"
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                <div className="w-3 h-3 bg-white border-r border-b border-border transform rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5" />
              </div>
            )}
          </div>

          {/* Social Links */}
          <a
            href="https://space.bilibili.com/368719574?spm_id_from=333.1007.0.0"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            Bilibili
          </a>
          <a
            href="https://www.xiaohongshu.com/user/profile/5c57870b0000000011020e5a"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            小红书
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

