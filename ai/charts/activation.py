import numpy as np
import matplotlib.pyplot as plt
from scipy.interpolate import CubicSpline
from matplotlib import cm
from matplotlib.widgets import Slider

points = [
    {'complexity': 0.1, 'familiarity': 0.9, 'friction': 0.2, 'label': 'Program in Go'},
    {'complexity': 0.2, 'familiarity': 1.0, 'friction': 0.7, 'label': 'Program in Bash'},
    {'complexity': 0.0, 'familiarity': 0.6, 'friction': 0.3, 'label': 'Invoke ffmpeg'},
    {'complexity': 0.7, 'familiarity': 0.8, 'friction': 0.4, 'label': 'Build a compiler'},
    {'complexity': 1.0, 'familiarity': 0.7, 'friction': 1.0, 'label': 'Solve P=NP'},
    {'complexity': 0.2, 'familiarity': 0.2, 'friction': 0.3, 'label': 'Center a div'},
]

x_points = np.array([p['complexity'] for p in points])  # Complexity
y_points = np.array([p['familiarity'] for p in points])  # Familiarity
z_points = np.array([p['friction'] for p in points])  # Friction
labels = [p['label'] for p in points]

r = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
x_complexity = np.array(r)
y_familiarity = np.array(r)

# Complexity vs friction data (Pre-AI)
f_complexity_pre = np.array([0.4, 0.6, 0.7, 0.8, 0.9, 0.8, 0.7, 0.7, 0.6, 0.3, 0.0])
f_familiarity_pre = np.array([0.0, 0.0, 0.0, 0.1, 0.1, 0.2, 0.3, 0.5, 0.6, 0.8, 0.9])
# Complexity vs friction data (Post-AI)
f_complexity_post = np.array([1.0, 0.9, 0.9, 0.9, 0.9, 0.8, 0.7, 0.7, 0.6, 0.3, 0.0])
f_familiarity_post = np.array([0.0, 0.0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9])
# All ez-pz
# f_complexity_post = np.array([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0])
# f_familiarity_post = np.array([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0])

# Create spline functions
cs_complexity_pre = CubicSpline(x_complexity, f_complexity_pre)
cs_familiarity_pre = CubicSpline(y_familiarity, f_familiarity_pre)
cs_complexity_post = CubicSpline(x_complexity, f_complexity_post)
cs_familiarity_post = CubicSpline(y_familiarity, f_familiarity_post)

# Create meshgrid for surfaces
X = np.linspace(0, 1, 200)
Y = np.linspace(0, 1, 200)
X_mesh, Y_mesh = np.meshgrid(X, Y)

def get_surface_friction(cs_complexity, cs_familiarity, x, y):
    friction = cs_complexity(x) * cs_familiarity(y)
    friction = np.clip(friction, 0, 1)
    return friction

plots = []
def make_plot(n, index, title, cs_complexity, cs_familiarity):
    ax = fig.add_subplot(1, n, index, projection='3d')
    plots.append(ax)

    ax.set_title(title)
    ax.set_xlabel('Complexity')
    ax.set_ylabel('Familiarity')
    ax.set_zlabel('Friction')
    # ax.view_init(elev=15, azim=-135)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_zlim(0, 1)
    
    # Compute friction surface
    friction_surface = get_surface_friction(cs_complexity, cs_familiarity, X_mesh, Y_mesh)
    
    # Evaluate friction at data points
    friction_at_points = get_surface_friction(cs_complexity, cs_familiarity, x_points, y_points)
    
    # Determine if each point is above or below the surface
    is_below_surface = z_points <= friction_at_points
    
    # Assign colors based on position relative to surface
    point_colors = np.where(is_below_surface, 'green', 'red')
    
    # Separate points into above and below surface
    x_below = x_points[is_below_surface]
    y_below = y_points[is_below_surface]
    z_below = z_points[is_below_surface]
    labels_below = np.array(labels)[is_below_surface]
    
    x_above = x_points[~is_below_surface]
    y_above = y_points[~is_below_surface]
    z_above = z_points[~is_below_surface]
    labels_above = np.array(labels)[~is_below_surface]
    
    # Plot green points (below surface) before surface
    ax.scatter(x_below, y_below, z_below, color='green', s=50, depthshade=False)
    
    # Optionally, add vertical lines from points to the surface for below points
    for i in range(len(x_below)):
        ax.plot(
            [x_below[i], x_below[i]],
            [y_below[i], y_below[i]],
            [z_below[i], friction_at_points[is_below_surface][i]],
            color='green',
            linestyle='dashed',
            linewidth=1,
        )
    
    # Plot the surface
    ax.plot_surface(
        X_mesh,
        Y_mesh,
        friction_surface,
        cmap=cm.viridis,
        alpha=0.8,
        edgecolor='none',
    )
    
    # Plot red points (above surface) after surface
    ax.scatter(x_above, y_above, z_above, color='red', s=50, depthshade=False)
    
    # Add vertical lines from surface to above points
    for i in range(len(x_above)):
        ax.plot(
            [x_above[i], x_above[i]],
            [y_above[i], y_above[i]],
            [friction_at_points[~is_below_surface][i], z_above[i]],
            color='red',
            linestyle='dashed',
            linewidth=1,
        )
    
    # Plot labels after everything else
    # Plot labels for below points
    for i in range(len(x_below)):
        ax.text(x_below[i], y_below[i], z_below[i], labels_below[i], color='black', zorder=10)
    
    # Plot labels for above points
    for i in range(len(x_above)):
        ax.text(x_above[i], y_above[i], z_above[i], labels_above[i], color='black', zorder=10)

fig = plt.figure(figsize=(14, 6))
make_plot(2, 1, 'Motivation threshold w/  AI assistance', cs_complexity_pre, cs_familiarity_pre)
make_plot(2, 2, 'Motivation threshold w/o AI assistance', cs_complexity_post, cs_familiarity_post)

# Add sliders for synchronized control of elev and azim
ax_elev = plt.axes([0.2, 0.02, 0.65, 0.03], facecolor='lightgray')
slider_elev = Slider(ax_elev, 'Elevation', 0, 90, valinit=15)

ax_azim = plt.axes([0.2, 0.06, 0.65, 0.03], facecolor='lightgray')
slider_azim = Slider(ax_azim, 'Azimuth', -180, 180, valinit=-135)

def update(val):
    elev = slider_elev.val
    azim = slider_azim.val
    for plot in plots:
        plot.view_init(elev=elev, azim=azim)
    fig.canvas.draw_idle()

slider_elev.on_changed(update)
slider_azim.on_changed(update)

plt.tight_layout()
plt.show()
