"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create inboxes table
    op.create_table(
        'inboxes',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('last_activity', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_inboxes_email'), 'inboxes', ['email'], unique=True)
    
    # Create messages table
    op.create_table(
        'messages',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('inbox_id', sa.String(), nullable=False),
        sa.Column('from_address', sa.String(), nullable=False),
        sa.Column('to_address', sa.String(), nullable=False),
        sa.Column('subject', sa.Text(), nullable=True),
        sa.Column('text_content', sa.Text(), nullable=True),
        sa.Column('html_content', sa.Text(), nullable=True),
        sa.Column('raw_message', sa.Text(), nullable=True),
        sa.Column('received_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['inbox_id'], ['inboxes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_messages_inbox_id'), 'messages', ['inbox_id'], unique=False)
    op.create_index(op.f('ix_messages_received_at'), 'messages', ['received_at'], unique=False)
    
    # Create attachments table
    op.create_table(
        'attachments',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('message_id', sa.String(), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('content_type', sa.String(), nullable=False),
        sa.Column('size', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['message_id'], ['messages.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_attachments_message_id'), 'attachments', ['message_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_attachments_message_id'), table_name='attachments')
    op.drop_table('attachments')
    op.drop_index(op.f('ix_messages_received_at'), table_name='messages')
    op.drop_index(op.f('ix_messages_inbox_id'), table_name='messages')
    op.drop_table('messages')
    op.drop_index(op.f('ix_inboxes_email'), table_name='inboxes')
    op.drop_table('inboxes')

