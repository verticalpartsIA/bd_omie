"""
Launcher: inicia populate_crm.py como processo completamente independente no Windows.
Executa: python launch_crm.py
"""
import subprocess, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
script  = os.path.join(HERE, "populate_crm.py")
logfile = os.path.join(HERE, "crm_log.txt")
errfile = os.path.join(HERE, "crm_err.txt")

# DETACHED_PROCESS = 0x00000008 (Windows)
# CREATE_NEW_CONSOLE = 0x00000010
DETACHED = 0x00000008
CREATE_NO_WINDOW = 0x08000000

with open(logfile, "w", encoding="utf-8") as fout, \
     open(errfile, "w", encoding="utf-8") as ferr:
    proc = subprocess.Popen(
        [sys.executable, "-u", script] + sys.argv[1:],
        stdout=fout, stderr=ferr,
        creationflags=DETACHED | CREATE_NO_WINDOW,
        close_fds=True,
    )

print(f"PID: {proc.pid}")
print(f"Log: {logfile}")
print(f"Err: {errfile}")
print("Processo iniciado em background. Use 'tail -f' ou abra o log para acompanhar.")
