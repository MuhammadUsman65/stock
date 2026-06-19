"""
Train an LSTM model for a ticker and save it to app/ml/artifacts/.

Usage:
    cd backend
    python3 scripts/train_lstm.py AAPL
    python3 scripts/train_lstm.py AAPL --epochs 50 --period 5y

This is the recommended way to train models - run it yourself when you
need a new/updated model, rather than relying solely on the /retrain API
endpoint for every ticker. Training inside a live web request on a free
hosting tier ties up that worker for the whole training duration.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services import lstm_service  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description="Train an LSTM model for a stock ticker.")
    parser.add_argument("ticker", help="Stock ticker, e.g. AAPL")
    parser.add_argument("--epochs", type=int, default=100, help="Maximum epochs - early stopping will likely halt training sooner")
    parser.add_argument("--period", default="2y", help="History to train on: 1y, 2y, 5y, max")
    args = parser.parse_args()

    print(f"Training LSTM for {args.ticker.upper()} (up to {args.epochs} epochs, {args.period} of history)...")
    meta = lstm_service.train_and_save_model(args.ticker, epochs=args.epochs, period=args.period)

    print("\nDone.")
    print(f"  Train rows:          {meta['train_rows']}")
    print(f"  Test rows:           {meta['test_rows']}")
    print(f"  Epochs run:          {meta['epochs_actually_run']} / {meta['max_epochs']} max"
          + (" (early stopping kicked in)" if meta['epochs_actually_run'] < meta['max_epochs'] else " (hit the max - consider raising --epochs)"))
    print(f"  Residual std:        {meta['residual_std']:.5f} (used to size confidence bands)")
    print(f"  Saved to:            app/ml/artifacts/{args.ticker.upper()}_lstm.keras")


if __name__ == "__main__":
    main()