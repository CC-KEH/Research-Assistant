import logging
import os
import sys

logging_str = ('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

log_dir = 'logs'
log_filepath = os.path.join(log_dir, 'running_logs.log')
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format=logging_str,
    handlers=[
        logging.FileHandler(log_filepath),  # Stores logs in the Filepath
        logging.StreamHandler(sys.stdout)  # Prints logs in the Terminal
    ]
)

logger = logging.getLogger('src_logger')