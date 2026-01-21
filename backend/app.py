# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from google.cloud import firestore
from datetime import datetime
import uuid
import json

app = Flask(__name__)
CORS(app)

# Initialize Firestore
db = firestore.Client()

class ProjectManager:
    def __init__(self):
        self.db = db
    
    def create_project(self, user_id, project_data):
        """Create a new project for user"""
        project_ref = self.db.collection('users').document(user_id).collection('projects')
        project_id = str(uuid.uuid4())
        
        project = {
            'id': project_id,
            'name': project_data.get('name', 'Untitled Project'),
            'createdAt': datetime.utcnow(),
            'modifiedAt': datetime.utcnow(),
            'settings': {
                'resolution': project_data.get('resolution', '1080p'),
                'fps': project_data.get('fps', 30),
                'duration': project_data.get('duration', 10)
            },
            'layers': project_data.get('layers', []),
            'assets': project_data.get('assets', []),
            'version': 1,
            'isTemplate': project_data.get('isTemplate', False)
        }
        
        project_ref.document(project_id).set(project)
        
        # Update user's project count
        user_ref = self.db.collection('users').document(user_id)
        user_ref.update({'projectsCount': firestore.Increment(1)})
        
        return project_id
    
    def get_user_projects(self, user_id):
        """Get all projects for a user"""
        projects_ref = self.db.collection('users').document(user_id).collection('projects')
        docs = projects_ref.order_by('modifiedAt', direction=firestore.Query.DESCENDING).stream()
        
        projects = []
        for doc in docs:
            project_data = doc.to_dict()
            project_data['id'] = doc.id
            projects.append(project_data)
        
        return projects
    
    def update_project(self, user_id, project_id, update_data):
        """Update project data"""
        project_ref = self.db.collection('users').document(user_id).collection('projects').document(project_id)
        
        update_data['modifiedAt'] = datetime.utcnow()
        update_data['version'] = firestore.Increment(1)
        
        project_ref.update(update_data)
        
        return True
    
    def save_as_template(self, user_id, project_id, template_data):
        """Save project as community template"""
        project_ref = self.db.collection('users').document(user_id).collection('projects').document(project_id)
        project_doc = project_ref.get()
        
        if not project_doc.exists:
            return None
        
        project_data = project_doc.to_dict()
        template_id = str(uuid.uuid4())
        
        template = {
            'id': template_id,
            'name': template_data.get('name', project_data['name']),
            'description': template_data.get('description', ''),
            'category': template_data.get('category', 'general'),
            'creatorId': user_id,
            'creatorName': template_data.get('creatorName'),
            'createdAt': datetime.utcnow(),
            'downloads': 0,
            'rating': 0,
            'price': template_data.get('price', 0),
            'projectData': {
                'layers': project_data.get('layers', []),
                'settings': project_data.get('settings', {}),
                'assets': project_data.get('assets', [])
            },
            'previewUrl': template_data.get('previewUrl'),
            'tags': template_data.get('tags', [])
        }
        
        # Save to templates collection
        self.db.collection('templates').document(template_id).set(template)
        
        # Update user's template count
        user_ref = self.db.collection('users').document(user_id)
        user_ref.update({'templatesCreated': firestore.Increment(1)})
        
        return template_id
    
    def get_templates(self, category=None, limit=20):
        """Get community templates with optional filtering"""
        templates_ref = self.db.collection('templates')
        
        if category:
            query = templates_ref.where('category', '==', category)
        else:
            query = templates_ref
        
        docs = query.order_by('createdAt', direction=firestore.Query.DESCENDING).limit(limit).stream()
        
        templates = []
        for doc in docs:
            template_data = doc.to_dict()
            template_data['id'] = doc.id
            templates.append(template_data)
        
        return templates

project_manager = ProjectManager()

# API Routes
@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.json
    user_id = data.get('userId')
    
    if not user_id:
        return jsonify({'error': 'User ID required'}), 400
    
    project_id = project_manager.create_project(user_id, data)
    return jsonify({'projectId': project_id})

@app.route('/api/projects/<user_id>', methods=['GET'])
def get_projects(user_id):
    projects = project_manager.get_user_projects(user_id)
    return jsonify({'projects': projects})

@app.route('/api/projects/<user_id>/<project_id>', methods=['PUT'])
def update_project(user_id, project_id):
    data = request.json
    success = project_manager.update_project(user_id, project_id, data)
    return jsonify({'success': success})

@app.route('/api/templates', methods=['POST'])
def create_template():
    data = request.json
    template_id = project_manager.save_as_template(
        data.get('userId'),
        data.get('projectId'),
        data.get('templateData', {})
    )
    
    if template_id:
        return jsonify({'templateId': template_id})
    return jsonify({'error': 'Failed to create template'}), 400

@app.route('/api/templates', methods=['GET'])
def get_templates():
    category = request.args.get('category')
    limit = int(request.args.get('limit', 20))
    
    templates = project_manager.get_templates(category, limit)
    return jsonify({'templates': templates})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
