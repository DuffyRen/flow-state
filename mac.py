import os
import sys

try:
    import webview
except ImportError:
    print("错误: 缺少依赖库 'pywebview'。")
    print("请先在终端运行: pip install pywebview")
    sys.exit(1)

def get_html_path():
    """获取同一目录下的 HTML 页面路径"""
    base_path = os.path.dirname(os.path.abspath(__file__))
    candidates = ('code_artifact.html', 'index.html')

    for name in candidates:
        html_file = os.path.join(base_path, name)
        if os.path.exists(html_file):
            return html_file

    print("错误: 找不到页面文件 code_artifact.html 或 index.html")
    print(f"请确保 HTML 文件与 mac.py 位于同一目录: {base_path}")
    sys.exit(1)

if __name__ == '__main__':
    file_path = get_html_path()
    
    # 创建一个纯净的原生桌面窗口
    # width 和 height 与我们设计的 UI 比例完美契合
    window = webview.create_window(
        title='Flow State - 沉浸式番茄钟',
        url=f"file://{file_path}",
        width=1100,
        height=750,
        resizable=True,
        text_select=False,  # 禁用全局文本选中，让它感觉更像一个原生 App 而不是网页
        background_color='#F4F7F8' # 匹配 HTML 的护眼背景色
    )
    
    # 启动应用 (在 Mac 上将自动调用内置的 macOS WebKit 引擎)
    print("正在启动 Flow State 桌面版...")
    webview.start()