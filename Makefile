


format:
	black src


test:
	pytest


test-cov:
	pytest --cov=src src --cov-report=html 