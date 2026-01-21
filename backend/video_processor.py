# video_processor.py
import subprocess
import json
import os
from datetime import datetime
from flask import Blueprint, request, jsonify
import tempfile

video_bp = Blueprint('video', __name__)

class VideoRenderer:
    def __init__(self):
        self.temp_dir = tempfile.gettempdir()
    
    def render_project(self, project_data, output_path):
        """Render project using FFmpeg"""
        # Create FFmpeg command from project data
        command = self.build_ffmpeg_command(project_data, output_path)
        
        try:
            # Execute FFmpeg
            subprocess.run(command, check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError as e:
            print(f"FFmpeg error: {e.stderr}")
            return False
    
    def build_ffmpeg_command(self, project_data, output_path):
        """Build FFmpeg command from project layers"""
        base_command = ['ffmpeg', '-y']
        
        # Add input files
        inputs = []
        filter_complex = []
        
        for i, layer in enumerate(project_data['layers']):
            if layer['type'] == 'video':
                inputs.extend(['-i', layer['source']])
                # Add video filter
                filter_complex.append(
                    f"[{i}:v]scale={project_data['settings']['resolution']}"
                    f",setpts=PTS-STARTPTS+{layer['start']}/TB[v{i}]"
                )
            elif layer['type'] == 'image':
                inputs.extend(['-loop', '1', '-i', layer['source']])
                filter_complex.append(
                    f"[{i}:v]scale={project_data['settings']['resolution']}"
                    f",trim=duration={layer['duration']}[v{i}]"
                )
        
        # Combine layers
        if filter_complex:
            filter_complex.append(f"{''.join([f'[v{i}]' for i in range(len(project_data['layers']))])}"
                                 f"overlay=shortest=1[out]")
        
        # Final command
        command = base_command + inputs + ['-filter_complex', ';'.join(filter_complex)]
        command += ['-map', '[out]', '-c:v', 'libx264', '-preset', 'fast', output_path]
        
        return command

renderer = VideoRenderer()

@video_bp.route('/api/render', methods=['POST'])
def render_video():
    """API endpoint to render video"""
    data = request.json
    project_id = data.get('projectId')
    user_id = data.get('userId')
    
    # Get project data from Firestore
    # (Implementation similar to earlier Firestore code)
    
    # Create output path
    output_filename = f"render_{project_id}_{datetime.utcnow().timestamp()}.mp4"
    output_path = os.path.join(renderer.temp_dir, output_filename)
    
    # Render video
    success = renderer.render_project(data.get('projectData'), output_path)
    
    if success:
        # Upload to Firebase Storage
        storage_path = f"renders/{user_id}/{output_filename}"
        # (Add Firebase Storage upload code here)
        
        return jsonify({
            'success': True,
            'url': storage_path,
            'filename': output_filename
        })
    
    return jsonify({'success': False, 'error': 'Render failed'}), 500

@video_bp.route('/api/export-presets', methods=['GET'])
def get_export_presets():
    """Get export presets for different platforms"""
    presets = {
        'instagram': {
            'resolution': '1080x1080',
            'format': 'mp4',
            'fps': 30,
            'bitrate': '5M'
        },
        'youtube': {
            'resolution': '1920x1080',
            'format': 'mp4',
            'fps': 30,
            'bitrate': '12M'
        },
        'tiktok': {
            'resolution': '1080x1920',
            'format': 'mp4',
            'fps': 60,
            'bitrate': '8M'
        }
    }
    return jsonify({'presets': presets})
