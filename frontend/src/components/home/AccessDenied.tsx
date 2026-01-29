'use client';

interface AccessDeniedProps {
  onLogin: () => void;
}

export function AccessDenied({ onLogin }: AccessDeniedProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl"
      style={{
        height: '400px',
        textAlign: 'center',
        padding: '40px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
      }}
    >
      <div className="text-6xl mb-5">🔒</div>
      <h2 className="text-2xl font-bold mb-4">Learning分类需要登录访问</h2>
      <p className="opacity-90 leading-relaxed mb-6">
        Learning分类包含专业的学习资源和内容，
        <br />
        请先登录后再访问此分类。
      </p>
      <button
        onClick={onLogin}
        className="px-6 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          border: '2px solid white',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'white';
          e.currentTarget.style.color = '#667eea';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
          e.currentTarget.style.color = 'white';
        }}
      >
        立即登录访问
      </button>
    </div>
  );
}

export default AccessDenied;

