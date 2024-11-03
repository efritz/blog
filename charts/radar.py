import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import matplotlib.path as mpath

# Define data as a list of dictionaries combining dimensions and scores
data = [
    {"dimension": "Generating Routine Code", "score": 4},
    {"dimension": "Writing and Expanding Functionality", "score": 3},
    {"dimension": "Code Optimization", "score": 1},
    {"dimension": "Debugging Assistance", "score": -2},
    {"dimension": "Refactoring and Maintainability", "score": -3},
    {"dimension": "Integrating with Existing Codebases", "score": -4},
    {"dimension": "Learning Support and Conceptual Tutoring", "score": 4},
    {"dimension": "Edge Case Identification", "score": 1},
    {"dimension": "Productivity Impact", "score": 2},
    {"dimension": "Creativity Boost", "score": 1}
]

# Extract dimensions and scores from the data structure
dimensions = [item["dimension"] for item in data]
scores = [item["score"] for item in data]

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
ax.set_rgrids([-5, 0, 5], labels=['−5', '0', '+5'])  # Add radial value labels
plt.ylim(-5, 5)

# Add radial lines (spokes)
for angle in angles:
    ax.plot([angle, angle], [0, 5], color='gray', linestyle='-', linewidth=0.5, alpha=0.3)
    ax.plot([angle, angle], [-5, 0], color='gray', linestyle='-', linewidth=0.5, alpha=0.3)

# Add distance lines (concentric circles)
circles = np.arange(-5, 6, 1)
for radius in circles:
    if radius == 0:
        # Make the baseline bold and add label
        ax.plot(np.linspace(0, 2*np.pi, 100), [radius]*100, 
                color='black', linewidth=2, linestyle='-', alpha=0.5)
        ax.text(np.pi/4, 0, 'baseline', fontsize=8, 
                horizontalalignment='left', verticalalignment='bottom')
    else:
        ax.plot(np.linspace(0, 2*np.pi, 100), [radius]*100, 
                color='gray', linewidth=0.5, linestyle='-', alpha=0.3)

# Plot each segment with color centered around each peak
for i in range(len(scores)):
    # Get the current peak (point A)
    A_angle = angles[i]
    A_radius = scores[i]
    
    # Get left and right neighbor peaks
    left_idx = (i - 1) % len(scores)
    right_idx = (i + 1) % len(scores)
    left_angle = angles[left_idx]
    right_angle = angles[right_idx]
    left_radius = scores[left_idx]
    right_radius = scores[right_idx]
    
    # Calculate points B and C (midpoints of lines to neighbor peaks)
    # For angles, we need to handle the circular nature carefully
    B_angle = (A_angle + left_angle) / 2
    C_angle = (A_angle + right_angle) / 2
    if abs(left_angle - A_angle) > np.pi:
        if left_angle < A_angle:
            B_angle = (A_angle + (left_angle + 2*np.pi)) / 2
        else:
            B_angle = (A_angle + (left_angle - 2*np.pi)) / 2
    if abs(right_angle - A_angle) > np.pi:
        if right_angle < A_angle:
            C_angle = (A_angle + (right_angle + 2*np.pi)) / 2
        else:
            C_angle = (A_angle + (right_angle - 2*np.pi)) / 2
            
    # Calculate B and C radii (midpoints of lines to neighbor peaks)
    B_radius = (A_radius + left_radius) / 2
    C_radius = (A_radius + right_radius) / 2
    
    # Points D and E are at the baseline (radius = 0)
    D_angle, E_angle = B_angle, C_angle
    D_radius, E_radius = 0, 0
    
    # Create the polygon vertices
    polygon_angles = [B_angle, A_angle, C_angle, E_angle, D_angle]
    polygon_radii = [B_radius, A_radius, C_radius, E_radius, D_radius]
    
    # Plot the filled polygon
    ax.fill(polygon_angles, polygon_radii, color=colors[i], alpha=0.6)

# Add dots, value labels, and dimension labels at the peaks
for i, (dimension, score) in enumerate(zip(dimensions, scores)):
    # Plot dot at the peak
    ax.plot(angles[i], score, 'o', color='black', markersize=6)
    
    # Add value label slightly above the dot
    label_radius = score + 0.3 if score >= 0 else score - 0.3
    ax.text(angles[i], label_radius, str(score), 
            horizontalalignment='center', verticalalignment='center',
            fontweight='bold')
    
    # Add dimension label further above/below the value label
    dimension_radius = score + 0.8 if score >= 0 else score - 0.8
    ax.text(angles[i], dimension_radius, dimension,
            horizontalalignment='center', verticalalignment='center',
            size=8, wrap=True)

# Add title
plt.title("Fully Color-Coded AI Usefulness Radar Chart", size=15, y=1.05)

# Show the plot
plt.show()