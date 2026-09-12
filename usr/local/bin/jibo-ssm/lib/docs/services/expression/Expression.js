    /**
     * Sets the DOFs present in animData (inplace), by specifying a set to intersect with (have ONLY these DOFs)
     * and a set to union with (make sure to have AT LEAST these DOFs).
     *
     * First the "dofsIntersect" DOFs are used to intersect with the DOFs present in the underlying animData.
     * Only DOFs present both in the animData AND in the dofsIntersect argument remain after this
     * step (null "dofsIntersect" means "all dofs in animData", and thus removes no DOFs).
     *
     * Next the "dofsUnion" DOFs are used to union with the DOFs remaining after the intersection
     * step; the resulting animation will include all DOFs present after the intersection AND any DOFs listed
     * in the dofsUnion (null means "no dofs", and thus has no affect).  Any DOFs included in the union
     * but not included in "(motion intersect dofsIntersect)" set will have default values only.
     *
     * Examples:
     * <ul>
     *   <li>Animation has ABC, Desire A only: setDOFs( A, null, animData)</li>
     *   <li>I want no C: setDOFs( ALL-C, null, animData)</li>
     *   <li>I want original DOFs from animation, but make sure anim has A, default values ok if missing: setDOFs(null, A, animData)</li>
     *   <li>I want the DOFs present in animation, but make sure A is there and is default: setDOFs( ALL-A, A, animData)</li>
     *   <li>I want the animation to include exactly AB, default values if either is missing: setDOFs(AB, AB, animData)</li>
     * </ul>
     *
     *
     * Commonly-used DOF groups are defined in [animate.dofs]{@link jibo.animate.dofs}.
     * @param dofIntersect - Set of dofs to limit animation to (null to NOT limit at all)
     * @param dofUnion - Set of dofs to extend animation to (null to NOT extend at all)
     * @param animData - inplace modified animation data
     */

    /**
     * Apply the scaling and muting tranformation option to the animData.
     * (Other transformations [.loops, .speed] are handled by the builder).
     * @param options
     * @param animData
     */