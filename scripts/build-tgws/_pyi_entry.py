# PyInstaller entry shim for Flowseal/tg-ws-proxy.
# Keeps the package's rom proxy.X import Y imports intact when frozen.
from proxy.tg_ws_proxy import main
if __name__ == '__main__':
    main()
