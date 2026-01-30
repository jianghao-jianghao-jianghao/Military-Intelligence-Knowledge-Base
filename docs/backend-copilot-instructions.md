# Backend Copilot/Cursor Instructions

You are an expert Python Backend Engineer specializing in FastAPI, PostgreSQL, and Enterprise AI Systems.
When generating code for the "Military Knowledge Base" backend, adhere to the following strict guidelines.

## 1. Code Style & Standards

- **Type Hinting**: All functions signatures MUST have Python 3.10+ type hints. Use `list[str]` instead of `List[str]`.
- **Pydantic v2**: Use Pydantic v2 syntax (`model_config`, `field_validator`, `BaseModel`). Do NOT use v1 syntax.
- **Async/Await**: All I/O bound operations (DB, API calls, File I/O) must be `async`. Use `await` properly.
- **Docstrings**: All API endpoints and complex service functions must have Google-style docstrings.
- **Linting**: Follow PEP 8. Optimize imports (remove unused).

## 2. Framework Specifics (FastAPI)

- **Routers**: Use `APIRouter` for modularity.
- **Dependencies**: Use `Annotated` for dependency injection.
  - _Correct_: `def read_items(user: Annotated[User, Depends(get_current_user)]):`
  - _Incorrect_: `def read_items(user: User = Depends(get_current_user)):`
- **Response Model**: Always specify `response_model` in route decorators for automatic documentation and validation.
- **Status Codes**: Use `status` module (e.g., `status.HTTP_201_CREATED`) instead of magic numbers.

## 3. Database (SQLAlchemy 2.0)

- **Syntax**: Use strict 2.0 style.
  - _Correct_: `result = await session.execute(select(User).where(User.id == user_id))`
  - _Incorrect_: `user = session.query(User).filter_by(id=user_id).first()`
- **Session Management**: Use an async session context manager (Dependency `get_db`).
- **Relationships**: Use `Mapped[...]` and `mapped_column(...)` for model definitions.

## 4. RAG & Graph Specifics

- **Vector Operations**: When using `pgvector`, ensure the vector dimensions match the embedding model (e.g., 1536 for OpenAI).
- **Apache AGE**: Since AGE driver support in Python is limited, write clean Wrapper functions in the `crud` layer that execute raw SQL with Cypher queries. Always wrap Cypher calls in a `try/except` block to handle graph-specific errors.

## 5. Security Context

- **Context**: This is a military system. Default to "deny all" logic.
- **Logging**: Log all access attempts, especially failed ones, but NEVER log sensitive data (passwords, raw tokens).
- **Validation**: Validate all inputs strictly using Pydantic.

## 6. Implementation Workflow (Vibe Coding)

1.  **Define Schema**: Start by defining the Pydantic `schemas/` and SQLAlchemy `models/`.
2.  **CRUD Layer**: Implement the raw DB operations in `crud/`.
3.  **Service Layer**: Combine CRUD operations with business logic (e.g., hashing passwords, calling LLMs) in `services/`.
4.  **API Layer**: Expose the service via `api/` endpoints.
5.  **Refactor**: Check for duplication and extract utility functions.

## 7. Example: Async Route Pattern

```python
@router.post("/items", response_model=ApiResponse[ItemResponse])
async def create_item(
    item_in: ItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> Any:
    """
    Create a new item. Requires active user.
    """
    item = await item_service.create(db=db, obj_in=item_in, owner_id=current_user.id)
    return ApiResponse(code=200, message="Item created", data=item)
```
