import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors

# Define data as a list of dictionaries combining dimensions and scores
data = [
    {"dimension": "Code Optimization", "score": 1},
    {"dimension": "Creativity Boost", "score": 1},
    {"dimension": "Debugging Assistance", "score": -2},
    {"dimension": "Edge Case Identification", "score": 1},
    {"dimension": "Generating Routine Code", "score": 4},
    {"dimension": "Integrating with Existing Codebases", "score": -4},
    {"dimension": "Learning Support and Conceptual Tutoring", "score": 4},
    {"dimension": "Productivity Impact", "score": 2},
    {"dimension": "Refactoring and Maintainability", "score": -3},
    {"dimension": "Writing and Expanding Functionality", "score": 3},
]

# Extract dimensions and scores from the data structure
dimensions = [item["dimension"] for item in data]
scores = [item["score"] for item in data]

# Create normalized scores (add 5 to shift from -5:5 to 0:10 range)
normalized_scores = [score + 5 for score in scores]

# Calculate the angles for each axis in the plot
angles = np.linspace(0, 2 * np.pi, len(data), endpoint=False).tolist()

# Set up color mapping for scores
norm = mcolors.TwoSlopeNorm(vmin=-5, vcenter=0, vmax=5)
colors = [mcolors.to_rgba(plt.cm.RdYlGn(norm(score))) for score in scores]

# Initialize radar chart
fig, ax = plt.subplots(figsize=(10, 10), subplot_kw=dict(polar=True))

# Draw the outline of the chart
ax.set_theta_offset(np.pi / 2)
ax.set_theta_direction(-1)

# Set the range for the radial axis and configure labels
ax.set_rlabel_position(0)
ax.set_thetagrids([])  # Remove degree labels
ax.set_rgrids([0, 5, 10], labels=['−5', '0', '+5'])  # Add radial value labels with original scale
plt.ylim(0, 10)

# Add radial lines (spokes)
for angle in angles:
    ax.plot([angle, angle], [0, 10], color='gray', linestyle='-', linewidth=0.5, alpha=0.3)

# Add distance lines (concentric circles)
circles = np.arange(0, 11, 1)
for radius in circles:
    if radius == 5:  # 5 is the new baseline (was 0)
        # Make the baseline bold and add label
        ax.plot(np.linspace(0, 2*np.pi, 100), [radius]*100, 
                color='black', linewidth=2, linestyle='-', alpha=0.5)
        ax.text(np.pi/4, radius, 'baseline', fontsize=8, 
                horizontalalignment='left', verticalalignment='bottom')
    else:
        ax.plot(np.linspace(0, 2*np.pi, 100), [radius]*100, 
                color='gray', linewidth=0.5, linestyle='-', alpha=0.3)

# Plot each segment with color centered around each peak
for i in range(len(scores)):
    # Get the current peak (point A)
    A_angle = angles[i]
    A_radius = normalized_scores[i]
    
    # Get left and right neighbor peaks
    left_idx = (i - 1) % len(scores)
    right_idx = (i + 1) % len(scores)
    left_angle = angles[left_idx]
    right_angle = angles[right_idx]
    left_radius = normalized_scores[left_idx]
    right_radius = normalized_scores[right_idx]
    
    # Calculate points B and C as true midpoints of the straight lines between peaks
    # Convert polar coordinates to Cartesian for proper midpoint calculation
    A_x = A_radius * np.cos(A_angle)
    A_y = A_radius * np.sin(A_angle)
    
    left_x = left_radius * np.cos(left_angle)
    left_y = left_radius * np.sin(left_angle)
    
    right_x = right_radius * np.cos(right_angle)
    right_y = right_radius * np.sin(right_angle)
    
    # Calculate midpoints in Cartesian coordinates
    B_x = (A_x + left_x) / 2
    B_y = (A_y + left_y) / 2
    
    C_x = (A_x + right_x) / 2
    C_y = (A_y + right_y) / 2
    
    # Convert back to polar coordinates
    B_angle = np.arctan2(B_y, B_x)
    C_angle = np.arctan2(C_y, C_x)
    
    # Handle negative angles (arctan2 returns angles in [-π, π])
    if B_angle < 0:
        B_angle += 2 * np.pi
    if C_angle < 0:
        C_angle += 2 * np.pi
    
    # Calculate radii using Pythagorean theorem
    B_radius = np.sqrt(B_x**2 + B_y**2)
    C_radius = np.sqrt(C_x**2 + C_y**2)
    
    # Points D and E are at the baseline (radius = 0)
    D_angle, E_angle = B_angle, C_angle
    D_radius, E_radius = 5, 5  # New baseline is 5 instead of 0
    
    # Create the polygon vertices
    polygon_angles = [B_angle, A_angle, C_angle, E_angle, D_angle]
    polygon_radii = [B_radius, A_radius, C_radius, E_radius, D_radius]
    
    # Plot the filled polygon
    ax.fill(polygon_angles, polygon_radii, color=colors[i], alpha=0.6)

# Add dots, value labels, and dimension labels at the peaks
for i, (dimension, score) in enumerate(zip(dimensions, scores)):
    # Plot dot at the peak
    ax.plot(angles[i], normalized_scores[i], 'o', color='black', markersize=6)
    
    # Add value label slightly above the dot
    normalized_label_radius = normalized_scores[i] + (0.3 if score >= 0 else -0.3)
    ax.text(angles[i], normalized_label_radius, str(score), 
            horizontalalignment='center', verticalalignment='center',
            fontweight='bold')
    
    # Add dimension label further above/below the value label
    normalized_dimension_radius = normalized_scores[i] + (0.8 if score >= 0 else -0.8)
    ax.text(angles[i], normalized_dimension_radius, dimension,
            horizontalalignment='center', verticalalignment='center',
            size=8, wrap=True)

# Add title
plt.title("Fully Color-Coded AI Usefulness Radar Chart", size=15, y=1.05)

# Show the plot
plt.show()