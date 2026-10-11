from http.server import SimpleHTTPRequestHandler, HTTPServer
from pathlib import Path
from functools import partial
from time import time_ns

ROOT = Path(__file__).resolve().parents[1]
class PreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
    def do_GET(self):
        if self.path in ['/loon-preview', '/loon-checks', '/harbour-checks']:
            html = (ROOT / 'index.html').read_text().replace('</body>', '''<script>
              Math.random = () => 0;
              selectedDay = window.DIVE_DAYS.find(day => day.id === '2026-09-28');
              document.querySelector('#selectDay').value = selectedDay.id;
              quickMode = false; document.body.classList.remove('quick-mode');
            </script></body>''')
            if self.path == '/loon-checks':
                html = html.replace('</body>', f'<script src="tests/loon-browser-check.js?v={time_ns()}"></script></body>')
            if self.path == '/harbour-checks':
                html = html.replace('</body>', f'<script src="tests/harbour-browser-check.js?v={time_ns()}"></script></body>')
            payload = html.encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        else:
            super().do_GET()
if __name__ == '__main__':
    print('Loon preview: http://127.0.0.1:8765/loon-preview', flush=True)
    HTTPServer(('127.0.0.1', 8765), partial(PreviewHandler, directory=str(ROOT))).serve_forever()
