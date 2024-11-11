# Activation Energy Barrier Diagram Script
# Author: [Your Name]
# Date: [Today's Date]

import numpy as np
import matplotlib.pyplot as plt

# Step 1: Define the range for Task Familiarity or Complexity
# 0 = Highly Familiar, 10 = Unfamiliar
x = np.linspace(0, 10, 500)

# Step 2: Define Activation Energy functions
# Before AI Assistance (Higher Activation Energy)
y_before = np.exp(0.5 * x)

# After AI Assistance (Lower Activation Energy)
y_after = y_before * 0.5  # AI reduces activation energy by 50%

# Step 3: Plot the Activation Energy Curves
plt.figure(figsize=(12, 7))
plt.plot(x, y_before, label='Before AI Assistance', color='red', linewidth=2)
plt.plot(x, y_after, label='After AI Assistance', color='green', linewidth=2)

# Step 4: Annotate Specific Tasks
# Define task positions based on familiarity (x-values)
tasks = {
    'Visualization Software': 2,
    'Adding ToC to Website': 5,
    'Creating ffmpeg Script': 8
}

for task_name, x_task in tasks.items():
    # Calculate y-values for both curves at the task point
    y_before_task = np.exp(0.5 * x_task)
    y_after_task = y_before_task * 0.5

    # Plot markers on the curves
    plt.scatter(x_task, y_before_task, color='red', s=50)
    plt.scatter(x_task, y_after_task, color='green', s=50)

    # Draw vertical dotted lines connecting the two points
    plt.vlines(x_task, y_after_task, y_before_task, colors='gray', linestyles='dashed')

    # Annotate the tasks
    plt.text(x_task, y_before_task + 50, f'{task_name}\nHigh Effort Without AI', color='red', ha='center')
    plt.text(x_task, y_after_task - 70, f'{task_name}\nLower Effort With AI', color='green', ha='center')

# Step 5: Customize the Plot
plt.title('AI Lowers Activation Energy for Task Initiation', fontsize=16)
plt.xlabel('Task Familiarity or Complexity', fontsize=14)
plt.ylabel('Activation Energy (Effort Required)', fontsize=14)
plt.legend(fontsize=12)
plt.grid(True, which='both', linestyle='--', linewidth=0.5)
plt.tight_layout()

# Step 6: Display the Plot
plt.show()
