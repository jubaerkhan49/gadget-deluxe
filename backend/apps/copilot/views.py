"""
Copilot API Views:
Exposes authenticated chat interface for web frontend and Android application.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .service import CopilotService

class CopilotChatAPIView(APIView):
    """
    POST /api/copilot/chat/
    Body:
    {
        "message": "How many iPhone 15 Pro Max do we have in stock?",
        "history": [
            {"role": "user", "text": "Hi"},
            {"role": "model", "text": "Hello! How can I assist with inventory today?"}
        ]
    }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        is_admin = (
            getattr(user, 'role', '') == 'ADMIN' or
            user.is_superuser or
            user.username.lower() in ['jubaer', 'admin']
        )
        if not is_admin:
            return Response(
                {"error": "Access denied. AI Copilot is only accessible to administrators."},
                status=status.HTTP_403_FORBIDDEN
            )

        user_message = request.data.get('message', '').strip()
        if not user_message:
            return Response(
                {"error": "Message cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST
            )

        history = request.data.get('history', [])
        username = user.username if user.is_authenticated else None

        try:
            result = CopilotService.process_chat(
                user_message=user_message,
                history=history,
                user_username=username
            )
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            import logging
            logging.getLogger(__name__).exception("Error in CopilotChatAPIView")
            return Response(
                {
                    "reply": f"⚠️ I encountered an error while analyzing your request: {str(e)}. Please try rephrasing or asking again.",
                    "actions_taken": [],
                    "referenced_devices": [],
                    "suggestions": ["Check inventory summary", "Show in-stock devices"]
                },
                status=status.HTTP_200_OK
            )

