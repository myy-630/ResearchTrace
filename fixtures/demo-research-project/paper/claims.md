# AF Prediction

## Results

On AF-demo, Future30 improved AUPRC from 0.5490 with Recon-only to 0.5614.

## Settings

Future30 used a 20-second history window, a 30-second future window, and learning rate 1e-4.

## Data

AF-demo was split by patient into training and test sets.

## Statistics

Across 5 random seeds, Future30 achieved mean AUPRC 0.5580 with standard deviation 0.0030.
